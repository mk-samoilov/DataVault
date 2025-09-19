import hashlib
import json
import mimetypes

from pathlib import Path
from typing import Dict
from datetime import datetime

from .conf import STORAGE_DIR, MAX_ONE_FILE_SIZE, MAX_STORAGE_SIZE


class FileServer:
    def __init__(self):
        self.storage_dir = Path(STORAGE_DIR)

        self.storage_dir.mkdir(exist_ok=True)

        self.metadata_file = self.storage_dir / "metadata.json"
        self.metadata = self._load_metadata()

    def _load_metadata(self) -> Dict:
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                return {"files": {}, "stats": {"total_files": 0, "total_size": 0}}
        return {"files": {}, "stats": {"total_files": 0, "total_size": 0}}
    
    def _save_metadata(self):
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.metadata, ensure_ascii=False, indent=2))
    
    @staticmethod
    def _get_file_hash(file_path: Path) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    @staticmethod
    def _get_mime_type(filename: str) -> str:
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or "application/octet-stream"
    
    def upload_file(self, file_data: bytes, filename: str) -> Dict:
        if len(file_data) > MAX_ONE_FILE_SIZE:
            return {"success": False, "error": f"Файл слишком большой. Максимум: {MAX_ONE_FILE_SIZE // (1024**3)} GB"}
        
        current_size = self.metadata["stats"]["total_size"]
        if current_size + len(file_data) > MAX_STORAGE_SIZE:
            return {"success": False, "error": f"Недостаточно места. Максимум: {MAX_STORAGE_SIZE // (1024**3)} GB"}
        
        file_hash = hashlib.md5(file_data).hexdigest()
        file_path = self.storage_dir / file_hash
        
        try:
            with open(file_path, "wb") as f:
                f.write(file_data)
            
            file_info = {
                "filename": filename,
                "hash": file_hash,
                "size": len(file_data),
                "upload_time": datetime.now().isoformat(),
                "mime_type": self._get_mime_type(filename)
            }
            
            self.metadata["files"][file_hash] = file_info
            self.metadata["stats"]["total_files"] += 1
            self.metadata["stats"]["total_size"] += len(file_data)
            self._save_metadata()
            
            return {"success": True, "file_hash": file_hash, "file_info": file_info}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def download_file(self, file_hash: str) -> Dict:
        if file_hash not in self.metadata["files"]:
            return {"success": False, "error": "Файл не найден"}
        
        file_path = self.storage_dir / file_hash
        if not file_path.exists():
            return {"success": False, "error": "Файл не найден на диске"}
        
        try:
            with open(file_path, "rb") as f:
                file_data = f.read()
            
            file_info = self.metadata["files"][file_hash]
            return {
                "success": True,
                "file_data": file_data,
                "filename": file_info["filename"],
                "mime_type": file_info["mime_type"]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_file(self, file_hash: str) -> Dict:
        if file_hash not in self.metadata["files"]:
            return {"success": False, "error": "Файл не найден"}
        
        try:
            file_path = self.storage_dir / file_hash
            if file_path.exists():
                file_size = self.metadata["files"][file_hash]["size"]
                file_path.unlink()
            
                del self.metadata["files"][file_hash]
                self.metadata["stats"]["total_files"] -= 1
                self.metadata["stats"]["total_size"] -= file_size
                self._save_metadata()
            
                return {"success": True, "message": "Файл удален"}

            return {"success": False, "error": "Файл не найден"}

        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def list_files(self, limit: int = 50, offset: int = 0) -> Dict:
        files = list(self.metadata["files"].items())
        files.sort(key=lambda x: x[1]["upload_time"], reverse=True)
        
        paginated_files = files[offset:offset + limit]
        file_list = []
        
        for file_hash, file_info in paginated_files:
            file_list.append({
                "hash": file_hash,
                "filename": file_info["filename"],
                "size": file_info["size"],
                "upload_time": file_info["upload_time"],
                "mime_type": file_info["mime_type"]
            })
        
        return {
            "success": True,
            "files": file_list,
            "total": len(files),
            "limit": limit,
            "offset": offset
        }
    
    def get_file_info(self, file_hash: str) -> Dict:
        if file_hash not in self.metadata["files"]:
            return {"success": False, "error": "Файл не найден"}
        
        return {"success": True, "file_info": self.metadata["files"][file_hash]}
    
    def get_stats(self) -> Dict:
        return {
            "success": True,
            "stats": self.metadata["stats"],
            "storage_limit": MAX_STORAGE_SIZE,
            "file_limit": MAX_ONE_FILE_SIZE
        }
    
    def search_files(self, query: str) -> Dict:
        results = []
        query_lower = query.lower()
        
        for file_hash, file_info in self.metadata["files"].items():
            if query_lower in file_info["filename"].lower():
                results.append({
                    "hash": file_hash,
                    "filename": file_info["filename"],
                    "size": file_info["size"],
                    "upload_time": file_info["upload_time"],
                    "mime_type": file_info["mime_type"]
                })
        
        return {"success": True, "files": results, "total": len(results)}
    
    def get_file_by_name(self, filename: str) -> Dict:
        """Найти файл по имени и вернуть его данные"""
        for file_hash, file_info in self.metadata["files"].items():
            if file_info["filename"] == filename:
                # Загружаем данные файла
                file_path = self.storage_dir / file_hash
                if not file_path.exists():
                    return {"success": False, "error": "Файл не найден на диске"}
                
                try:
                    with open(file_path, "rb") as f:
                        file_data = f.read()
                    
                    return {
                        "success": True,
                        "file_data": file_data,
                        "filename": file_info["filename"],
                        "mime_type": file_info["mime_type"]
                    }
                except Exception as e:
                    return {"success": False, "error": str(e)}
        
        return {"success": False, "error": "Файл не найден"}


file_server_instance = FileServer()
