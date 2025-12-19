/**
 * OpenTelemetry Configuration and Setup
 * Provides distributed tracing and metrics collection
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { Logger } from '@nodecg/types';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  prometheusPort?: number;
  otlpEndpoint?: string;
  sampleRate?: number;
}

export class TelemetryService {
  private sdk: NodeSDK | null = null;
  private prometheusExporter: PrometheusExporter | null = null;
  private config: TelemetryConfig;
  private logger: Logger;

  constructor(config: TelemetryConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Telemetry is disabled');
      return;
    }

    try {
      this.logger.info('Initializing OpenTelemetry...');

      // Create resource attributes
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this.config.serviceName,
        [ATTR_SERVICE_VERSION]: this.config.serviceVersion,
        environment: this.config.environment,
      });

      // Setup Prometheus exporter for metrics
      this.prometheusExporter = new PrometheusExporter({
        port: this.config.prometheusPort || 9464,
        endpoint: '/metrics',
      });

      // Setup OTLP trace exporter (optional, for centralized tracing)
      let traceExporter = undefined;
      if (this.config.otlpEndpoint) {
        traceExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        });
      }

      // Initialize NodeSDK
      this.sdk = new NodeSDK({
        resource,
        metricReader: this.prometheusExporter,
        spanProcessor: traceExporter ? new BatchSpanProcessor(traceExporter) : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Customize auto-instrumentation
            '@opentelemetry/instrumentation-fs': {
              enabled: false, // Disable fs instrumentation to reduce noise
            },
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              ignoreIncomingRequestHook: (request) => {
                // Ignore health check endpoints
                const url = request.url || '';
                return url.includes('/health') || url.includes('/metrics');
              },
            },
            '@opentelemetry/instrumentation-fastify': {
              enabled: true,
            },
          }),
        ],
      });

      // Start the SDK
      await this.sdk.start();

      this.logger.info(
        `OpenTelemetry initialized - Prometheus metrics available at http://localhost:${this.config.prometheusPort || 9464}/metrics`
      );
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      this.logger.info('Shutting down OpenTelemetry...');
      try {
        await this.sdk.shutdown();
        this.logger.info('OpenTelemetry shutdown complete');
      } catch (error) {
        this.logger.error('Error shutting down OpenTelemetry:', error);
      }
    }
  }

  getPrometheusExporter(): PrometheusExporter | null {
    return this.prometheusExporter;
  }
}
