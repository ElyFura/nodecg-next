/* eslint-disable no-undef, no-unused-vars */
/**
 * k6 Load Test for NodeCG Next
 * Tests basic HTTP endpoints and measures performance
 *
 * Usage:
 *   k6 run basic-load-test.js
 *   k6 run --vus 50 --duration 5m basic-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const healthCheckDuration = new Trend('health_check_duration');
const metricsCheckDuration = new Trend('metrics_check_duration');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
    errors: ['rate<0.1'], // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: Health check endpoint
  {
    const res = http.get(`${BASE_URL}/health`);
    const duration = res.timings.duration;
    healthCheckDuration.add(duration);

    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check has status ok': (r) => r.json('status') === 'ok',
      'health check duration < 100ms': () => duration < 100,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  sleep(1);

  // Test 2: Readiness check
  {
    const res = http.get(`${BASE_URL}/ready`);
    check(res, {
      'readiness check status is 200': (r) => r.status === 200,
      'readiness check has status ready': (r) => r.json('status') === 'ready',
    });
  }

  sleep(1);

  // Test 3: Metrics endpoint
  {
    const res = http.get(`${BASE_URL}/metrics`);
    const duration = res.timings.duration;
    metricsCheckDuration.add(duration);

    check(res, {
      'metrics endpoint status is 200': (r) => r.status === 200,
      'metrics response is text': (r) => r.headers['Content-Type'].includes('text/plain'),
      'metrics duration < 200ms': () => duration < 200,
    });
  }

  sleep(2);

  // Test 4: GraphQL endpoint (if available)
  {
    const query = `
      query {
        bundles {
          name
          version
        }
      }
    `;

    const res = http.post(
      `${BASE_URL}/graphql`,
      JSON.stringify({ query }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    check(res, {
      'graphql status is 200': (r) => r.status === 200,
      'graphql has data': (r) => r.json('data') !== undefined,
    });
  }

  sleep(3);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}Load Test Summary
${indent}================
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
${indent}
${indent}Response Times:
${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}
${indent}Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
${indent}
${indent}Virtual Users: ${data.metrics.vus.values.max}
${indent}Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s
  `;

  return summary;
}
