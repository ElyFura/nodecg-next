# NodeCG Next - Budget & Kostenaufstellung
## Detaillierte Finanzplanung für vollständige Neuimplementierung

**Version:** 1.0  
**Gesamtbudget:** 600.000 €  
**Zeitrahmen:** 14 Monate  
**Status:** Planning Phase  

---

## 💰 Budget-Übersicht

### Gesamtkosten

| Kategorie | Betrag | Anteil |
|-----------|--------|--------|
| **Personalkosten** | 480.000 € | 80% |
| **Infrastructure** | 28.000 € | 5% |
| **Tools & Lizenzen** | 14.000 € | 2% |
| **External Services** | 10.000 € | 2% |
| **Contingency (20%)** | 68.000 € | 11% |
| **GESAMT** | **600.000 €** | **100%** |

---

## 👥 Personalkosten (480.000 €)

### Team-Zusammensetzung & Stundensätze

| Rolle | Stundensatz | Stunden | Kosten |
|-------|-------------|---------|--------|
| **Senior Architect** | 100 €/h | 2.040 h | 204.000 € |
| **Full-Stack Developer #1** | 80 €/h | 1.920 h | 153.600 € |
| **Full-Stack Developer #2** | 80 €/h | 960 h | 76.800 € |
| **Frontend Developer** | 75 €/h | 720 h | 54.000 € |
| **DevOps Engineer** | 85 €/h | 300 h | 25.500 € |
| **Technical Writer** | 60 €/h | 120 h | 7.200 € |
| **QA Engineer** | 70 €/h | 120 h | 8.400 € |
| **Subtotal** | | **6.180 h** | **529.500 €** |
| **Rabatt (10%)** | | | **-49.500 €** |
| **GESAMT** | | | **480.000 €** |

### Detaillierte Personaleinsatzplanung

#### Senior Architect / Tech Lead
**Einsatz:** 14 Monate, 100% (Vollzeit)
**Aufgaben:**
- Architektur-Design
- Code Reviews
- Team-Führung
- Stakeholder-Kommunikation
- Kritische Implementierungen

**Monatliche Aufschlüsselung:**
```
Monate 1-3:   180h/Monat × 3  = 540h  (Phase 1: Foundation)
Monate 4-6:   150h/Monat × 3  = 450h  (Phase 2-4: Core Features)
Monate 7-10:  140h/Monat × 4  = 560h  (Phase 5-8: Advanced)
Monate 11-14: 120h/Monat × 4  = 480h  (Phase 9-10: Docs & Launch)
Total:                         2.040h
Kosten: 2.040h × 100€ = 204.000€
```

#### Full-Stack Developer #1
**Einsatz:** 12 Monate, 100% (Vollzeit)
**Aufgaben:**
- Backend-Entwicklung
- API-Implementierung
- Database-Design
- Testing

**Monatliche Aufschlüsselung:**
```
Monate 1-12: 160h/Monat × 12 = 1.920h
Kosten: 1.920h × 80€ = 153.600€
```

#### Full-Stack Developer #2
**Einsatz:** 6 Monate, 100% (Vollzeit)
**Aufgaben:**
- Backend-Unterstützung
- Feature-Entwicklung
- Bug Fixes

**Monatliche Aufschlüsselung:**
```
Monate 4-9: 160h/Monat × 6 = 960h
Kosten: 960h × 80€ = 76.800€
```

#### Frontend Developer
**Einsatz:** 6 Monate, 75% (Teil-Vollzeit)
**Aufgaben:**
- Dashboard-Entwicklung (React)
- UI Component Library
- Responsive Design

**Monatliche Aufschlüsselung:**
```
Monate 5-10: 120h/Monat × 6 = 720h
Kosten: 720h × 75€ = 54.000€
```

#### DevOps Engineer
**Einsatz:** 5 Monate, 50% (Teil-Projektbasis)
**Aufgaben:**
- CI/CD Pipeline
- Docker/Kubernetes Setup
- Infrastructure as Code
- Production Deployment

**Monatliche Aufschlüsselung:**
```
Monat 1:      80h (Initial Setup)
Monate 6-8:   60h × 3 = 180h (K8s, Production)
Monate 9-10:  40h × 2 = 80h (Monitoring)
Total:        300h
Kosten: 300h × 85€ = 25.500€
```

#### Technical Writer
**Einsatz:** 3 Monate, 50% (Teil-Projektbasis)
**Aufgaben:**
- User Documentation
- Developer Guide
- API Reference
- Tutorial Videos

**Monatliche Aufschlüsselung:**
```
Monate 9-11: 40h/Monat × 3 = 120h
Kosten: 120h × 60€ = 7.200€
```

#### QA Engineer
**Einsatz:** 3 Monate, 50% (Teil-Projektbasis)
**Aufgaben:**
- Test Plan
- E2E Testing
- Performance Testing
- Security Testing

**Monatliche Aufschlüsselung:**
```
Monate 9-11: 40h/Monat × 3 = 120h
Kosten: 120h × 70€ = 8.400€
```

---

## 🖥️ Infrastructure (28.000 €)

### Cloud Services (14 Monate)

| Service | Monatlich | Gesamt (14 Monate) |
|---------|-----------|-------------------|
| **Development Environment** | | |
| ├─ AWS EC2 (t3.medium × 3) | 150 € | 2.100 € |
| ├─ RDS PostgreSQL (db.t3.medium) | 100 € | 1.400 € |
| ├─ ElastiCache Redis | 50 € | 700 € |
| ├─ S3 Storage (500GB) | 20 € | 280 € |
| **Staging Environment** | | |
| ├─ AWS ECS Fargate | 200 € | 2.800 € |
| ├─ RDS PostgreSQL (db.t3.small) | 75 € | 1.050 € |
| ├─ ElastiCache Redis | 30 € | 420 € |
| **Production Environment** | | |
| ├─ EKS Cluster (2 nodes) | 400 € | 5.600 € |
| ├─ RDS PostgreSQL (db.r5.large) | 300 € | 4.200 € |
| ├─ ElastiCache Redis Cluster | 150 € | 2.100 € |
| ├─ CloudFront CDN | 50 € | 700 € |
| ├─ S3 Storage (2TB) | 50 € | 700 € |
| **Monitoring & Logging** | | |
| ├─ CloudWatch | 80 € | 1.120 € |
| ├─ Datadog (optional) | 100 € | 1.400 € |
| **CI/CD** | | |
| ├─ GitHub Actions (Enterprise) | 100 € | 1.400 € |
| **Backup & DR** | | |
| ├─ Automated Backups | 50 € | 700 € |
| ├─ Cross-Region Replication | 30 € | 420 € |
| **GESAMT** | **~2.000 €/Monat** | **~28.000 €** |

**Hinweis:** Kosten sind Durchschnittswerte. Tatsächliche Kosten können variieren.

---

## 🛠️ Tools & Lizenzen (14.000 €)

### Development Tools

| Tool | Nutzer | Monate | Preis/Monat | Gesamt |
|------|--------|--------|-------------|--------|
| **JetBrains All Products** | 4 | 14 | 50 € | 2.800 € |
| **GitHub Team** | 6 | 14 | 20 € | 1.680 € |
| **Figma Professional** | 2 | 14 | 30 € | 840 € |
| **Postman Enterprise** | 4 | 14 | 15 € | 840 € |
| **Linear (Project Management)** | 6 | 14 | 10 € | 840 € |

### Testing & QA Tools

| Tool | Kosten |
|------|--------|
| **Playwright E2E Testing** | Gratis (Open Source) |
| **k6 Load Testing** | 2.000 € |
| **Snyk Security Scanning** | 1.500 € |
| **SonarQube Code Quality** | 1.200 € |

### Monitoring & Observability

| Tool | Kosten |
|------|--------|
| **Sentry Error Tracking** | 1.200 € |
| **Grafana Cloud (optional)** | 1.100 € |

**GESAMT:** **~14.000 €**

---

## 🔧 External Services (10.000 €)

### Security & Compliance

| Service | Kosten |
|---------|--------|
| **Security Audit (extern)** | 5.000 € |
| **Penetration Testing** | 3.000 € |
| **SSL Certificates (Wildcard)** | 500 € |

### Performance & Testing

| Service | Kosten |
|---------|--------|
| **Load Testing Service** | 1.000 € |
| **User Acceptance Testing** | 500 € |

**GESAMT:** **~10.000 €**

---

## 📊 Contingency Reserve (68.000 €)

### Risiko-Budget (20% vom Subtotal)

**Berechnung:**
```
Personalkosten:     480.000 €
Infrastructure:      28.000 €
Tools & Lizenzen:    14.000 €
External Services:   10.000 €
─────────────────────────────
Subtotal:           532.000 €

Contingency (20%):  106.400 €

Nach Optimierung:    68.000 € (ca. 13%)
```

**Verwendung:**
- Unvorhergesehene technische Probleme
- Scope Adjustments
- Zusätzliche Ressourcen bei Verzögerungen
- Budget-Puffer für Phase 10 (Launch)

---

## 💳 Zahlungsplan (Monatlich)

### Monatliche Kostenverteilung

| Monat | Personal | Infra | Tools | Services | Gesamt |
|-------|----------|-------|-------|----------|--------|
| M1 | 44.000 € | 2.000 € | 1.000 € | 500 € | 47.500 € |
| M2 | 44.000 € | 2.000 € | 1.000 € | 0 € | 47.000 € |
| M3 | 44.000 € | 2.000 € | 1.000 € | 0 € | 47.000 € |
| M4 | 50.000 € | 2.000 € | 1.000 € | 0 € | 53.000 € |
| M5 | 50.000 € | 2.000 € | 1.000 € | 0 € | 53.000 € |
| M6 | 50.000 € | 2.000 € | 1.000 € | 1.000 € | 54.000 € |
| M7 | 50.000 € | 2.000 € | 1.000 € | 0 € | 53.000 € |
| M8 | 50.000 € | 2.000 € | 1.000 € | 3.000 € | 56.000 € |
| M9 | 45.000 € | 2.000 € | 1.000 € | 2.000 € | 50.000 € |
| M10 | 45.000 € | 2.000 € | 1.000 € | 1.000 € | 49.000 € |
| M11 | 30.000 € | 2.000 € | 1.000 € | 1.000 € | 34.000 € |
| M12 | 30.000 € | 2.000 € | 1.000 € | 1.500 € | 34.500 € |
| M13 | 25.000 € | 2.000 € | 1.000 € | 0 € | 28.000 € |
| M14 | 25.000 € | 2.000 € | 1.000 € | 0 € | 28.000 € |
| **Σ** | **532.000 €** | **28.000 €** | **14.000 €** | **10.000 €** | **584.000 €** |

**Zzgl. Contingency Reserve: 68.000 €**

**GESAMTBUDGET: 600.000 €**

---

## 📈 Budget-Tracking & Reporting

### Monatliches Budget-Review

**Review-Prozess:**
1. **Woche 1 des Monats:** Budget-Status Report
2. **Abweichungen >5%:** Sofortige Eskalation
3. **Abweichungen >10%:** Stakeholder-Meeting
4. **Monatlicher Forecast:** Rolling 3-Month Forecast

**Budget-KPIs:**
- **Burn Rate:** Geplant vs. Tatsächlich
- **Cost per Feature Point:** Effizienz-Metrik
- **Budget Utilization:** % des Gesamtbudgets
- **Forecast Accuracy:** Vorhersage-Genauigkeit

### Budget-Eskalationspfad

```
Level 1 (0-5% Abweichung):
└─> Tech Lead → Dokumentation

Level 2 (5-10% Abweichung):
└─> Tech Lead → Project Manager → Budget Owner

Level 3 (>10% Abweichung):
└─> Tech Lead → PM → Budget Owner → CTO/CFO → Emergency Meeting
```

---

## 💡 Kosten-Optimierungs-Optionen

### Option A: Reduziertes Team (400k€)
**Einsparung: 200k€**

**Changes:**
- Kein Full-Stack Developer #2
- Frontend Developer nur 50%
- DevOps extern (Freelancer)
- Längere Entwicklungszeit (+4 Monate)

**Trade-off:** Zeitplan wird auf 16-18 Monate verlängert

### Option B: Cloud-Optimierung (560k€)
**Einsparung: 40k€**

**Changes:**
- Shared Development Environment
- Kein Staging Environment (Dev → Prod direkt)
- Selbst-gehostete Monitoring-Tools
- Weniger redundante Systeme

**Trade-off:** Höheres Risiko bei Deployments

### Option C: MVP-Fokus (480k€)
**Einsparung: 120k€**

**Changes:**
- GraphQL API → V1.1 verschoben
- Plugin System → V1.1 verschoben
- Nur React Dashboard (kein Vue/Svelte)
- Basic Observability

**Trade-off:** Weniger Features in V1.0

---

## 🎯 ROI-Projektion (5 Jahre)

### Investitions-Vergleich

**Neubau (NodeCG Next):**
```
Jahr 1: 600.000 € (Initiale Entwicklung)
Jahr 2:  15.000 € (Wartung)
Jahr 3:  20.000 € (Features)
Jahr 4:  10.000 € (Wartung)
Jahr 5:   5.000 € (Wartung)
─────────────────
Total: 650.000 €
```

**Migration (zum Vergleich):**
```
Jahr 1: 150.000 € (Migration)
Jahr 2:  25.000 € (Wartung)
Jahr 3:  30.000 € (Features)
Jahr 4:  50.000 € (Refactoring)
Jahr 5:  25.000 € (Wartung)
─────────────────
Total: 280.000 €
```

**Break-Even:** Nach ~8-9 Jahren (bei langfristiger Betrachtung)

**Nicht-monetäre Vorteile Neubau:**
- 🚀 Deutlich bessere Performance
- 💎 Höchste Code-Qualität
- 🔧 Einfachere Wartung
- 👥 Besseres Developer-Recruiting
- 🏢 Enterprise-tauglich
- 📈 Skalierbarkeit

---

## ✅ Budget-Freigabe Checkliste

**Vor Freigabe sicherstellen:**

- [ ] Stakeholder haben Budget-Dokument gelesen
- [ ] CTO/CFO Approval
- [ ] Budget Owner zugewiesen
- [ ] Zahlungsplan mit Finance abgestimmt
- [ ] Contingency-Verwendung geklärt
- [ ] Budget-Tracking-Prozess etabliert
- [ ] Eskalationspfad definiert
- [ ] Monatliche Review-Termine im Kalender

---

**Dokument-Version:** 1.0  
**Erstellt:** November 2025  
**Verantwortlich:** Budget Owner / CFO  
**Nächster Review:** Monatlich
