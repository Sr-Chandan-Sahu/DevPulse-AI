import httpx
from typing import Optional
from .models import TelemetryBatch

class DevPulseClient:
    def __init__(
        self,
        api_key: str,
        endpoint_url: str = "http://localhost:8000/api/v1/telemetry/ingest",
        timeout: float = 5.0
    ):
        self.api_key = api_key
        self.endpoint_url = endpoint_url
        self.timeout = timeout
        self._client = httpx.Client(
            timeout=self.timeout,
            headers={
                "X-DevPulse-API-Key": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "devpulse-sdk-python/1.0.0"
            }
        )

    def send_batch(self, batch: TelemetryBatch) -> bool:
        try:
            payload = batch.model_dump(mode="json")
            response = self._client.post(self.endpoint_url, json=payload)
            return response.status_code in (200, 201, 202)
        except Exception:
            return False

    def close(self):
        self._client.close()
