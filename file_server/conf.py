from pathlib import Path


server_core_dir = Path(__file__).resolve().parent

STORAGE_DIR = str(server_core_dir.parent) + "/storage"

MAX_ONE_FILE_SIZE = 4 * 1024 * 1024 * 1024 # 4 GB
MAX_STORAGE_SIZE = 16 * 1024 * 1024 * 1024 # 16 GB
