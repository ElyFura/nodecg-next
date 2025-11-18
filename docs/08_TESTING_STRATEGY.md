# NodeCG Next - Testing-Strategie
## Umfassender QA & Testing Plan

**Version:** 1.0  
**Test Coverage Ziel:** >90%  

---

## 🎯 Testing-Pyramide

```
           ╱╲
          ╱E2E╲         (10% - UI/Integration)
         ╱━━━━━━╲
        ╱Integration╲   (20% - API/Services)
       ╱━━━━━━━━━━━━╲
      ╱   Unit Tests  ╲ (70% - Functions/Classes)
     ╱━━━━━━━━━━━━━━━━╲
```

---

## 🧪 Unit Tests (Vitest)

**Ziel:** >85% Code Coverage

**Was wird getestet:**
- Alle Service-Klassen
- Utility Functions
- Business Logic
- Data Transformations

**Beispiel:**
```typescript
// replicant.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ReplicantService } from './replicant.service';

describe('ReplicantService', () => {
  let service: ReplicantService;

  beforeEach(() => {
    service = new ReplicantService(mockPrisma, mockLogger);
  });

  it('should create replicant with default value', async () => {
    const result = await service.register('test', 'myRep', {
      defaultValue: 42
    });
    expect(result).toBe(42);
  });

  it('should validate against schema', async () => {
    await expect(
      service.set('test', 'myRep', 'invalid')
    ).rejects.toThrow('Validation failed');
  });
});
```

---

## 🔗 Integration Tests

**Ziel:** API Endpoints, Database, WebSocket

**Was wird getestet:**
- REST API Endpoints
- GraphQL Queries/Mutations
- WebSocket Events
- Database Operations

**Beispiel:**
```typescript
// api.integration.test.ts
describe('API Integration', () => {
  it('POST /api/replicants should create replicant', async () => {
    const response = await request(app)
      .post('/api/replicants')
      .send({
        namespace: 'test',
        name: 'score',
        value: 0
      })
      .expect(201);

    expect(response.body).toMatchObject({
      namespace: 'test',
      name: 'score'
    });
  });
});
```

---

## 🌐 E2E Tests (Playwright)

**Ziel:** User Journeys im Dashboard

**Test Scenarios:**
1. User Login & Authentication
2. Bundle Management (Enable/Disable)
3. Replicant Updates (Dashboard → Graphics)
4. Asset Upload & Management
5. Settings Changes

**Beispiel:**
```typescript
// dashboard.e2e.test.ts
import { test, expect } from '@playwright/test';

test('user can update replicant value', async ({ page }) => {
  // Login
  await page.goto('http://localhost:9090/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to Bundle
  await page.click('text=Example Bundle');

  // Update Replicant
  await page.fill('[data-testid="score-input"]', '100');
  await page.click('[data-testid="score-submit"]');

  // Verify
  await expect(page.locator('[data-testid="score-display"]'))
    .toHaveText('100');
});
```

---

## ⚡ Performance Tests (k6)

**Ziel:** Latenz & Throughput messen

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp-up
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% under 100ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/replicants/test/score');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 🔐 Security Tests

**Tools:**
- Snyk (Dependency Scanning)
- OWASP ZAP (Penetration Testing)
- npm audit

**Tests:**
1. SQL Injection
2. XSS Attacks
3. CSRF Protection
4. Authentication Bypass
5. Authorization Checks

---

## 📊 Test Coverage Ziele

| Test Type | Coverage Target | Status |
|-----------|----------------|--------|
| Unit Tests | >85% | 🎯 |
| Integration Tests | >70% | 🎯 |
| E2E Tests | Critical Paths | 🎯 |
| Performance | <100ms p95 | 🎯 |
| Security | 0 Critical | 🎯 |

---

## 🚀 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test              # Unit Tests
      - run: pnpm test:integration  # Integration
      - run: pnpm test:e2e          # E2E Tests
      - run: pnpm test:coverage     # Coverage Report
```

---

**Dokument-Version:** 1.0
