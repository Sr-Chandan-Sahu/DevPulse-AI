import asyncio
import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("devpulse.ws")

class ConnectionManager:
    def __init__(self):
        # project_id -> Set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            if project_id not in self.active_connections:
                self.active_connections[project_id] = set()
            self.active_connections[project_id].add(websocket)
        logger.info(f"WebSocket client connected to project {project_id}. Total: {len(self.active_connections[project_id])}")

    async def disconnect(self, project_id: str, websocket: WebSocket):
        async with self.lock:
            if project_id in self.active_connections:
                self.active_connections[project_id].discard(websocket)
                if not self.active_connections[project_id]:
                    del self.active_connections[project_id]
        logger.info(f"WebSocket client disconnected from project {project_id}")

    async def broadcast_to_project(self, project_id: str, event_type: str, data: Any):
        """Broadcasts an event message to all connected clients in a project room."""
        message = {
            "type": event_type,
            "project_id": project_id,
            "data": data
        }
        json_str = json.dumps(message)
        
        async with self.lock:
            sockets = list(self.active_connections.get(project_id, []))

        for ws in sockets:
            try:
                await ws.send_text(json_str)
            except Exception as e:
                logger.warning(f"Error sending WebSocket message: {e}")
                await self.disconnect(project_id, ws)

ws_manager = ConnectionManager()
