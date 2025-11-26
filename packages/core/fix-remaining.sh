#!/bin/bash

# Fix telemetry.ts
sed -i 's/import { Resource as OTelResource } from/import { Resource } from/' src/observability/telemetry.ts
sed -i 's/import { BatchSpanProcessor } from.*$/import { BatchSpanProcessor } from "@opentelemetry\/sdk-trace-base";/' src/observability/telemetry.ts
sed -i 's/new OTelResource(/new Resource(/' src/observability/telemetry.ts
sed -i '/OTelResource/d' src/observability/telemetry.ts

# Fix performance.ts - add default 0 to potentially undefined values
sed -i 's/const min = durations\[0\];/const min = durations[0] ?? 0;/' src/observability/performance.ts
sed -i 's/const max = durations\[count - 1\];/const max = durations[count - 1] ?? 0;/' src/observability/performance.ts
sed -i 's/p95: durations\[p95Index\] || max,/p95: durations[p95Index] ?? max,/' src/observability/performance.ts
sed -i 's/p99: durations\[p99Index\] || max,/p99: durations[p99Index] ?? max,/' src/observability/performance.ts

echo "Fixes applied"
