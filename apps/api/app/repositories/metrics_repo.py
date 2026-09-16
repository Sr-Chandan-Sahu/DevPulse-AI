import math
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.models.telemetry import RequestRecord
from app.db.models.anomaly import AnomalyRecord
from app.schemas.metrics import (
    MetricsSummary,
    TimeSeriesPoint,
    SlowEndpointItem,
    TopErrorEndpointItem,
    OverviewDashboardResponse,
)

class MetricsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _parse_time_window(self, time_range: str) -> datetime.datetime:
        now = datetime.datetime.now(datetime.timezone.utc)
        mapping = {
            "5m": datetime.timedelta(minutes=5),
            "15m": datetime.timedelta(minutes=15),
            "1h": datetime.timedelta(hours=1),
            "6h": datetime.timedelta(hours=6),
            "24h": datetime.timedelta(hours=24),
            "7d": datetime.timedelta(days=7),
        }
        delta = mapping.get(time_range, datetime.timedelta(hours=1))
        return now - delta

    async def get_overview_dashboard(
        self,
        project_id: str,
        time_range: str = "1h",
        service: Optional[str] = None,
        environment: Optional[str] = None
    ) -> OverviewDashboardResponse:
        start_time = self._parse_time_window(time_range)
        filters = [
            RequestRecord.project_id == project_id,
            RequestRecord.timestamp >= start_time
        ]
        if service and service != "all":
            filters.append(RequestRecord.service == service)
        if environment and environment != "all":
            filters.append(RequestRecord.environment == environment)

        # 1. Fetch all matching request rows for precise percentile & time-series computation
        stmt = (
            select(
                RequestRecord.timestamp,
                RequestRecord.duration_ms,
                RequestRecord.status_code,
                RequestRecord.method,
                RequestRecord.path,
                RequestRecord.service
            )
            .where(and_(*filters))
            .order_by(RequestRecord.timestamp.asc())
        )
        res = await self.db.execute(stmt)
        records = res.all()

        total_requests = len(records)
        now = datetime.datetime.now(datetime.timezone.utc)
        duration_seconds = max(1.0, (now - start_time).total_seconds())
        rps = round(total_requests / duration_seconds, 2)

        if total_requests == 0:
            summary = MetricsSummary(
                total_requests=0,
                requests_per_second=0.0,
                error_rate=0.0,
                p50_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
                avg_latency_ms=0.0,
                active_anomalies_count=0
            )
            return OverviewDashboardResponse(
                summary=summary,
                series=[],
                slowest_endpoints=[],
                top_error_endpoints=[],
                service_health={"api-service": "HEALTHY"}
            )

        # Compute percentiles
        durations = sorted([r.duration_ms for r in records])
        def get_percentile(p: float) -> float:
            k = (len(durations) - 1) * p
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return durations[int(k)]
            return durations[int(f)] * (c - k) + durations[int(c)] * (k - f)

        p50 = round(get_percentile(0.50), 1)
        p95 = round(get_percentile(0.95), 1)
        p99 = round(get_percentile(0.99), 1)
        avg_lat = round(sum(durations) / total_requests, 1)

        errors_count = sum(1 for r in records if r.status_code >= 400)
        error_rate = round(errors_count / total_requests, 4)

        # Check active anomalies
        anomaly_stmt = select(func.count(AnomalyRecord.id)).where(
            AnomalyRecord.project_id == project_id,
            AnomalyRecord.status == "ACTIVE"
        )
        anom_res = await self.db.execute(anomaly_stmt)
        active_anomalies = anom_res.scalar_one() or 0

        summary = MetricsSummary(
            total_requests=total_requests,
            requests_per_second=rps,
            error_rate=error_rate,
            p50_latency_ms=p50,
            p95_latency_ms=p95,
            p99_latency_ms=p99,
            avg_latency_ms=avg_lat,
            active_anomalies_count=active_anomalies
        )

        # 2. Build Time Series Points (e.g., 20 evenly-spaced buckets)
        num_buckets = 20
        bucket_size = (now - start_time) / num_buckets
        series_points: List[TimeSeriesPoint] = []

        for i in range(num_buckets):
            b_start = start_time + (bucket_size * i)
            b_end = b_start + bucket_size
            b_records = [
                r for r in records
                if (r.timestamp if r.timestamp.tzinfo else r.timestamp.replace(tzinfo=datetime.timezone.utc)) >= b_start
                and (r.timestamp if r.timestamp.tzinfo else r.timestamp.replace(tzinfo=datetime.timezone.utc)) < b_end
            ]
            
            b_total = len(b_records)
            b_errs = sum(1 for r in b_records if r.status_code >= 400)
            b_rps = round(b_total / max(1.0, bucket_size.total_seconds()), 2)
            b_err_rate = round(b_errs / b_total, 4) if b_total > 0 else 0.0
            
            if b_records:
                b_durs = sorted([r.duration_ms for r in b_records])
                bp50 = round(b_durs[int(len(b_durs) * 0.50)], 1)
                bp95 = round(b_durs[min(len(b_durs)-1, int(len(b_durs) * 0.95))], 1)
                bp99 = round(b_durs[min(len(b_durs)-1, int(len(b_durs) * 0.99))], 1)
            else:
                bp50, bp95, bp99 = 0.0, 0.0, 0.0

            series_points.append(TimeSeriesPoint(
                timestamp=b_start.strftime("%H:%M:%S" if time_range in ["5m", "15m", "1h"] else "%m-%d %H:%M"),
                rps=b_rps,
                p50_latency=bp50,
                p95_latency=bp95,
                p99_latency=bp99,
                error_rate=b_err_rate,
                requests_count=b_total,
                errors_count=b_errs
            ))

        # 3. Slowest Endpoints
        endpoint_map: Dict[str, Dict[str, Any]] = {}
        for r in records:
            key = f"{r.method} {r.path}"
            if key not in endpoint_map:
                endpoint_map[key] = {
                    "method": r.method,
                    "path": r.path,
                    "service": r.service,
                    "durations": [],
                    "errors": 0
                }
            endpoint_map[key]["durations"].append(r.duration_ms)
            if r.status_code >= 400:
                endpoint_map[key]["errors"] += 1

        slowest_endpoints: List[SlowEndpointItem] = []
        top_error_endpoints: List[TopErrorEndpointItem] = []

        for key, data in endpoint_map.items():
            durs = sorted(data["durations"])
            count = len(durs)
            avg_d = round(sum(durs) / count, 1)
            p95_d = round(durs[min(count-1, int(count * 0.95))], 1)
            err_c = data["errors"]

            slowest_endpoints.append(SlowEndpointItem(
                method=data["method"],
                path=data["path"],
                service=data["service"],
                avg_latency_ms=avg_d,
                p95_latency_ms=p95_d,
                call_count=count
            ))

            if err_c > 0:
                top_error_endpoints.append(TopErrorEndpointItem(
                    method=data["method"],
                    path=data["path"],
                    service=data["service"],
                    error_count=err_c,
                    total_calls=count,
                    error_rate=round(err_c / count, 3)
                ))

        slowest_endpoints.sort(key=lambda x: x.avg_latency_ms, reverse=True)
        top_error_endpoints.sort(key=lambda x: x.error_rate, reverse=True)

        # Service Health Map
        service_health: Dict[str, str] = {}
        services = set(r.service for r in records)
        for srv in services:
            srv_records = [r for r in records if r.service == srv]
            srv_errs = sum(1 for r in srv_records if r.status_code >= 500)
            if srv_errs / len(srv_records) > 0.10:
                service_health[srv] = "DEGRADED"
            else:
                service_health[srv] = "HEALTHY"

        return OverviewDashboardResponse(
            summary=summary,
            series=series_points,
            slowest_endpoints=slowest_endpoints[:8],
            top_error_endpoints=top_error_endpoints[:8],
            service_health=service_health
        )
