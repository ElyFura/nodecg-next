#!/bin/bash
# Fix TypeScript errors in observability code

# Fix Sentry - remove profiling import and usage
sed -i "s/import { nodeProfilingIntegration } from '@sentry\/profiling-node';//" src/observability/sentry.ts
sed -i "/integrations: \[/,/\],/d" src/observability/sentry.ts

# Fix metrics - remove unused Summary import
sed -i "s/, Summary//" src/observability/metrics.ts

# Fix telemetry - fix imports
sed -i "s/import { Resource } from '@opentelemetry\/resources';/import { Resource as OTelResource } from '@opentelemetry\/resources';/" src/observability/telemetry.ts
sed -i "/import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry\/sdk-metrics';/d" src/observability/telemetry.ts
sed -i "s/new Resource(/new OTelResource(/" src/observability/telemetry.ts

# Fix performance.ts - add default values
sed -i "s/min: min || 0,/min,/" src/observability/performance.ts
sed -i "s/max: max || 0,/max,/" src/observability/performance.ts
sed -i "s/p95: durations\[p95Index\] || max || 0,/p95: durations[p95Index] ?? max,/" src/observability/performance.ts
sed -i "s/p99: durations\[p99Index\] || max || 0,/p99: durations[p99Index] ?? max,/" src/observability/performance.ts

# Fix unused parameters
sed -i "s/async (request, reply)/async (_request, reply)/" src/server/index.ts
sed -i "s/async (request, reply)/async (_request, reply)/g" src/server/routes/health.ts

echo "Fixes applied"
