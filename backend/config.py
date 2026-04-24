import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    CHAOS_API_KEY = os.getenv('CHAOS_API_KEY', '')
    DATABASE_URL = "sqlite+aiosqlite:///./recon.db"
    WS_HEARTBEAT = 30
    MAX_CONNECTIONS = 100
    TOOL_PATHS = [
        os.path.expanduser("~/go/bin"),
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/bin",
    ]
    UPLOAD_DIR = "uploads/wordlists"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    MAX_RESULTS_PER_PHASE = 100000
    BATCH_LIMIT = 50000
