from pathlib import Path


server_core_dir = Path(__file__).resolve().parent

STORAGE_DIR = str(server_core_dir.parent) + "/storage"
