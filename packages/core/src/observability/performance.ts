/**
 * Performance Monitoring Service
 * Tracks and reports performance metrics for critical operations
 */

import { Logger } from '@nodecg/types';
import { performance } from 'perf_hooks';

export interface PerformanceEntry {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  warn: number; // Warning threshold in milliseconds
  critical: number; // Critical threshold in milliseconds
}

export class PerformanceMonitor {
  private logger: Logger;
  private entries: Map<string, PerformanceEntry[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private thresholds: Map<string, PerformanceThresholds> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;

    // Set default thresholds
    this.setThreshold('replicant.update', { warn: 10, critical: 50 });
    this.setThreshold('bundle.load', { warn: 1000, critical: 5000 });
    this.setThreshold('http.request', { warn: 100, critical: 1000 });
    this.setThreshold('database.query', { warn: 50, critical: 200 });
    this.setThreshold('graphql.operation', { warn: 100, critical: 500 });
  }

  /**
   * Set performance thresholds for an operation
   */
  setThreshold(operation: string, thresholds: PerformanceThresholds): void {
    this.thresholds.set(operation, thresholds);
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string, id: string = 'default'): void {
    const key = `${operation}:${id}`;
    this.activeTimers.set(key, performance.now());
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(
    operation: string,
    id: string = 'default',
    metadata?: Record<string, any>
  ): number | null {
    const key = `${operation}:${id}`;
    const startTime = this.activeTimers.get(key);

    if (!startTime) {
      this.logger.warn(`No active timer found for ${key}`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(key);

    // Record the entry
    const entry: PerformanceEntry = {
      name: operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.entries.has(operation)) {
      this.entries.set(operation, []);
    }

    const entries = this.entries.get(operation)!;
    entries.push(entry);

    // Keep only last 100 entries per operation
    if (entries.length > 100) {
      entries.shift();
    }

    // Check thresholds
    this.checkThresholds(operation, duration, metadata);

    return duration;
  }

  /**
   * Measure the duration of a function
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = Math.random().toString(36).substring(7);
    this.startTimer(operation, id);

    try {
      const result = await fn();
      this.endTimer(operation, id, metadata);
      return result;
    } catch (error) {
      this.endTimer(operation, id, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure the duration of a synchronous function
   */
  measureSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const id = Math.random().toString(36).substring(7);
    this.startTimer(operation, id);

    try {
      const result = fn();
      this.endTimer(operation, id, metadata);
      return result;
    } catch (error) {
      this.endTimer(operation, id, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Check if duration exceeds thresholds and log warnings
   */
  private checkThresholds(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const thresholds = this.thresholds.get(operation);
    if (!thresholds) return;

    const metadataStr = metadata ? JSON.stringify(metadata) : '';

    if (duration > thresholds.critical) {
      this.logger.error(
        `CRITICAL: ${operation} took ${duration.toFixed(2)}ms (threshold: ${thresholds.critical}ms) ${metadataStr}`
      );
    } else if (duration > thresholds.warn) {
      this.logger.warn(
        `WARNING: ${operation} took ${duration.toFixed(2)}ms (threshold: ${thresholds.warn}ms) ${metadataStr}`
      );
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const entries = this.entries.get(operation);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map((e) => e.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / count;
    const min = durations[0] ?? 0;
    const max = durations[count - 1] ?? 0;

    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      avg,
      min,
      max,
      p95: durations[p95Index] ?? max,
      p99: durations[p99Index] ?? max,
    };
  }

  /**
   * Get all available operation names
   */
  getOperations(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Clear performance data
   */
  clear(operation?: string): void {
    if (operation) {
      this.entries.delete(operation);
      this.activeTimers.clear();
    } else {
      this.entries.clear();
      this.activeTimers.clear();
    }
  }

  /**
   * Get a performance report
   */
  getReport(): Record<string, any> {
    const report: Record<string, any> = {};

    for (const operation of this.getOperations()) {
      const stats = this.getStats(operation);
      if (stats) {
        report[operation] = stats;
      }
    }

    return report;
  }
}
