import queue
import threading
import time
import uuid
import datetime
from typing import Optional, List, Callable
from .models import RequestTelemetryPayload, TelemetryBatch

class BackgroundBatcher:
    def __init__(
        self,
        flush_callback: Callable[[TelemetryBatch], None],
        environment: str = "production",
        service: str = "api-service",
        max_batch_size: int = 50,
        flush_interval_seconds: float = 1.5,
    ):
        self.flush_callback = flush_callback
        self.environment = environment
        self.service = service
        self.max_batch_size = max_batch_size
        self.flush_interval_seconds = flush_interval_seconds
        
        self._queue: queue.Queue = queue.Queue(maxsize=10000)
        self._running = True
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()

    def enqueue(self, item: RequestTelemetryPayload):
        try:
            self._queue.put_nowait(item)
        except queue.Full:
            # Drop item if buffer is completely saturated to prevent memory exhaustion
            pass

    def _worker_loop(self):
        while self._running:
            items: List[RequestTelemetryPayload] = []
            deadline = time.time() + self.flush_interval_seconds
            
            while len(items) < self.max_batch_size:
                timeout = max(0.01, deadline - time.time())
                try:
                    item = self._queue.get(timeout=timeout)
                    items.append(item)
                except queue.Empty:
                    break
            
            if items:
                batch = TelemetryBatch(
                    batch_id=f"batch_{uuid.uuid4().hex[:12]}",
                    sent_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    environment=self.environment,
                    service=self.service,
                    requests=items
                )
                try:
                    self.flush_callback(batch)
                except Exception:
                    # Logging or error handling without disrupting application
                    pass
            else:
                time.sleep(0.1)

    def shutdown(self):
        self._running = False
        if self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)
