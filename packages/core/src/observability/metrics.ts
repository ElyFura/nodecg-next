/**
 * Custom Prometheus Metrics
 * Application-specific metrics for monitoring NodeCG Next performance
 */

import { register, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { Logger } from '@nodecg/types';

export class MetricsService {
  private logger: Logger;

  // Replicant Metrics
  public readonly replicantOperations: Counter;
  public readonly replicantUpdateDuration: Histogram;
  public readonly activeReplicants: Gauge;

  // Bundle Metrics
  public readonly bundlesLoaded: Gauge;
  public readonly bundleLoadDuration: Histogram;
  public readonly bundleErrors: Counter;

  // WebSocket Metrics
  public readonly websocketConnections: Gauge;
  public readonly websocketMessages: Counter;
  public readonly websocketErrors: Counter;

  // HTTP Metrics
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestErrors: Counter;

  // GraphQL Metrics
  public readonly graphqlOperations: Counter;
  public readonly graphqlOperationDuration: Histogram;
  public readonly graphqlErrors: Counter;

  // Database Metrics
  public readonly databaseQueryDuration: Histogram;
  public readonly databaseConnections: Gauge;
  public readonly databaseErrors: Counter;

  // Plugin Metrics
  public readonly pluginsLoaded: Gauge;
  public readonly pluginHookExecutions: Counter;
  public readonly pluginErrors: Counter;

  // System Metrics
  public readonly systemMemoryUsage: Gauge;
  public readonly systemCpuUsage: Gauge;

  constructor(logger: Logger) {
    this.logger = logger;

    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // Replicant Metrics
    this.replicantOperations = new Counter({
      name: 'nodecg_replicant_operations_total',
      help: 'Total number of replicant operations',
      labelNames: ['operation', 'namespace'],
      registers: [register],
    });

    this.replicantUpdateDuration = new Histogram({
      name: 'nodecg_replicant_update_duration_seconds',
      help: 'Duration of replicant update operations',
      labelNames: ['namespace', 'name'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    this.activeReplicants = new Gauge({
      name: 'nodecg_active_replicants',
      help: 'Number of active replicants',
      labelNames: ['namespace'],
      registers: [register],
    });

    // Bundle Metrics
    this.bundlesLoaded = new Gauge({
      name: 'nodecg_bundles_loaded',
      help: 'Number of loaded bundles',
      registers: [register],
    });

    this.bundleLoadDuration = new Histogram({
      name: 'nodecg_bundle_load_duration_seconds',
      help: 'Duration of bundle loading',
      labelNames: ['bundle'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.bundleErrors = new Counter({
      name: 'nodecg_bundle_errors_total',
      help: 'Total number of bundle errors',
      labelNames: ['bundle', 'error_type'],
      registers: [register],
    });

    // WebSocket Metrics
    this.websocketConnections = new Gauge({
      name: 'nodecg_websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
      registers: [register],
    });

    this.websocketMessages = new Counter({
      name: 'nodecg_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['namespace', 'event'],
      registers: [register],
    });

    this.websocketErrors = new Counter({
      name: 'nodecg_websocket_errors_total',
      help: 'Total number of WebSocket errors',
      labelNames: ['namespace', 'error_type'],
      registers: [register],
    });

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'nodecg_http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.httpRequestsTotal = new Counter({
      name: 'nodecg_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestErrors = new Counter({
      name: 'nodecg_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [register],
    });

    // GraphQL Metrics
    this.graphqlOperations = new Counter({
      name: 'nodecg_graphql_operations_total',
      help: 'Total number of GraphQL operations',
      labelNames: ['operation_name', 'operation_type'],
      registers: [register],
    });

    this.graphqlOperationDuration = new Histogram({
      name: 'nodecg_graphql_operation_duration_seconds',
      help: 'GraphQL operation duration',
      labelNames: ['operation_name', 'operation_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.graphqlErrors = new Counter({
      name: 'nodecg_graphql_errors_total',
      help: 'Total number of GraphQL errors',
      labelNames: ['operation_name', 'error_type'],
      registers: [register],
    });

    // Database Metrics
    this.databaseQueryDuration = new Histogram({
      name: 'nodecg_database_query_duration_seconds',
      help: 'Database query duration',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    this.databaseConnections = new Gauge({
      name: 'nodecg_database_connections',
      help: 'Number of active database connections',
      registers: [register],
    });

    this.databaseErrors = new Counter({
      name: 'nodecg_database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation', 'error_type'],
      registers: [register],
    });

    // Plugin Metrics
    this.pluginsLoaded = new Gauge({
      name: 'nodecg_plugins_loaded',
      help: 'Number of loaded plugins',
      registers: [register],
    });

    this.pluginHookExecutions = new Counter({
      name: 'nodecg_plugin_hook_executions_total',
      help: 'Total number of plugin hook executions',
      labelNames: ['plugin', 'hook'],
      registers: [register],
    });

    this.pluginErrors = new Counter({
      name: 'nodecg_plugin_errors_total',
      help: 'Total number of plugin errors',
      labelNames: ['plugin', 'error_type'],
      registers: [register],
    });

    // System Metrics
    this.systemMemoryUsage = new Gauge({
      name: 'nodecg_system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      registers: [register],
    });

    this.systemCpuUsage = new Gauge({
      name: 'nodecg_system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      registers: [register],
    });

    this.logger.info('Metrics service initialized with custom NodeCG metrics');

    // Update system metrics every 5 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000);
  }

  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.systemMemoryUsage.set(memUsage.heapUsed);

    // CPU usage (simplified - in production you might want more accurate measurement)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.systemCpuUsage.set(totalCpu);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getRegister() {
    return register;
  }
}
