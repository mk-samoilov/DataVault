from pathlib import Path


server_core_dir = Path(__file__).resolve().parent

STORAGE_DIR = str(server_core_dir.parent) + "/storage"

MAX_ONE_FILE_SIZE = 32 * 1024 * 1024 * 1024 # 32 GB
MAX_STORAGE_SIZE = 512 * 1024 * 1024 * 1024 # 512 GB
