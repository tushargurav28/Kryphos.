from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, scan_id: str):
        await websocket.accept()
        if scan_id not in self.active_connections:
            self.active_connections[scan_id] = []
        self.active_connections[scan_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, scan_id: str):
        """Safely disconnect - won't error if not in list"""
        if scan_id in self.active_connections:
            try:
                self.active_connections[scan_id].remove(websocket)
            except ValueError:
                pass  # Already removed, ignore
            if not self.active_connections[scan_id]:
                del self.active_connections[scan_id]
    
    async def broadcast(self, scan_id: str, message: dict):
        if scan_id in self.active_connections:
            message_json = json.dumps(message)
            disconnected = []
            for connection in self.active_connections[scan_id]:
                try:
                    await connection.send_text(message_json)
                except:
                    disconnected.append(connection)
            for conn in disconnected:
                try:
                    self.active_connections[scan_id].remove(conn)
                except:
                    pass
    
    async def broadcast_all(self, message: dict):
        message_json = json.dumps(message)
        for scan_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message_json)
                except:
                    pass

manager = ConnectionManager()