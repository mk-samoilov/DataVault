import sys
import json
from pathlib import Path

from .core import file_server_instance


def main():
    if len(sys.argv) < 2:
        print("Использование:")
        print("  python -m file_server upload <файл>")
        print("  python -m file_server download <hash>")
        print("  python -m file_server delete <hash>")
        print("  python -m file_server list [limit] [offset]")
        print("  python -m file_server info <hash>")
        print("  python -m file_server stats")
        print("  python -m file_server search <запрос>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "upload":
            if len(sys.argv) < 3:
                print("Ошибка: укажите файл для загрузки")
                sys.exit(1)
            
            file_path = Path(sys.argv[2])
            if not file_path.exists():
                print(f"Ошибка: файл {file_path} не найден")
                sys.exit(1)
            
            with open(file_path, "rb") as f:
                file_data = f.read()
            
            result = file_server_instance.upload_file(file_data, file_path.name)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "download":
            if len(sys.argv) < 3:
                print("Ошибка: укажите hash файла")
                sys.exit(1)
            
            file_hash = sys.argv[2]
            result = file_server_instance.download_file(file_hash)
            
            if result["success"]:
                filename = result["filename"]
                with open(filename, "wb") as f:
                    f.write(result["file_data"])
                print(f"Файл сохранен как: {filename}")
            else:
                print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "delete":
            if len(sys.argv) < 3:
                print("Ошибка: укажите hash файла")
                sys.exit(1)
            
            file_hash = sys.argv[2]
            result = file_server_instance.delete_file(file_hash)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "list":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 50
            offset = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            
            result = file_server_instance.list_files(limit, offset)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "info":
            if len(sys.argv) < 3:
                print("Ошибка: укажите hash файла")
                sys.exit(1)
            
            file_hash = sys.argv[2]
            result = file_server_instance.get_file_info(file_hash)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "stats":
            result = file_server_instance.get_stats()
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        elif command == "search":
            if len(sys.argv) < 3:
                print("Ошибка: укажите поисковый запрос")
                sys.exit(1)
            
            query = sys.argv[2]
            result = file_server_instance.search_files(query)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        
        else:
            print(f"Неизвестная команда: {command}")
            sys.exit(1)
    
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
