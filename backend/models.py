from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class ReconPhase(str, Enum):
    SUBDOMAIN = "subdomain"
    LIVE_HOST = "live_host"
    HTTPX = "httpx"
    PORT_SCAN = "port_scan"
    ENDPOINT = "endpoint"
    WAYBACK = "wayback"
    KATANA = "katana"
    JS_SCAN = "js_scan"
    VULNERABILITY = "vulnerability"
    NMAP = "nmap"
    TERMINAL = "terminal"
    COMPLETE = "complete"

class ScanRequest(BaseModel):
    target: str
    enable_screenshots: bool = False
    enable_nuclei: bool = True
    enable_js_scan: bool = True
    enable_wayback: bool = True
    enable_katana: bool = True
    enable_nmap: bool = True  # Changed default to True
    katana_depth: int = 6
    katana_rate_limit: int = 25

class ScanStatus(BaseModel):
    scan_id: str
    target: str
    status: str
    progress: int
    current_phase: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    stats: Dict[str, int] = {}