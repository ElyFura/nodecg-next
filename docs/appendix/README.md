# NodeCG Next - Appendix

Dieser Ordner enthält alle technischen Ressourcen und Templates für das NodeCG Next Rebuild-Projekt.

## 📁 Struktur

```
appendix/
├── prisma_schema.prisma          # Vollständiges Datenbankschema
├── docker-compose.yml            # Docker Orchestrierung
├── kubernetes_manifests/         # Kubernetes Deployment-Konfigurationen
│   ├── deployment.yaml          # Pod-Deployment mit HPA
│   ├── service.yaml             # Service-Definitionen
│   ├── config.yaml              # ConfigMaps & Secrets
│   └── pvc.yaml                 # Persistent Volume Claims
└── code_templates/              # Code-Templates für Bundle-Entwicklung
    ├── bundle.config.js         # Bundle-Konfigurations-Template
    ├── extension-template.js    # Extension-Template (Server-Side)
    ├── panel-template.html      # Dashboard-Panel-Template
    └── graphic-template.html    # OBS-Overlay-Template
```

---

## 🗄️ Datenbankschema

**Datei:** `prisma_schema.prisma`

Vollständiges Prisma-Schema für PostgreSQL mit allen Entitäten:

### Entitäten
- **Users & Auth**: User, Permission, Session, ApiKey
- **Bundles**: Bundle, BundlePermission, Graphic, Panel
- **Replicants**: Replicant, ReplicantHistory, ReplicantOperation
- **Assets**: AssetCategory, Asset
- **Messages**: Message
- **System**: Config, AuditLog, ScheduledJob
- **Monitoring**: Metric, ErrorLog

### Features
- ✅ Vollständige Beziehungen zwischen Entitäten
- ✅ JSON-Schema-Validierung für Replicants
- ✅ Audit-Logging für alle Änderungen
- ✅ Versionierung für Optimistic Locking
- ✅ Full-Text-Search Support
- ✅ Performance-Indizes

### Verwendung
```bash
# Schema initialisieren
npx prisma migrate dev --name init

# Prisma Client generieren
npx prisma generate

# Studio öffnen
npx prisma studio
```

---

## 🐳 Docker Compose

**Datei:** `docker-compose.yml`

Komplette Container-Orchestrierung für Development und Production.

### Services
- **nodecg-server**: Haupt-Applikation (Next.js)
- **postgres**: PostgreSQL 16 Datenbank
- **redis**: Cache & Pub/Sub
- **nginx**: Reverse Proxy & Load Balancer
- **prometheus**: Metriken-Collection
- **grafana**: Monitoring-Dashboards
- **loki** (optional): Log-Aggregation
- **promtail** (optional): Log-Shipper
- **backup** (optional): Auto-Backups

### Verwendung
```bash
# Development starten
docker-compose up -d

# Mit Monitoring
docker-compose --profile monitoring up -d

# Logs anzeigen
docker-compose logs -f nodecg-server

# Stoppen
docker-compose down
```

### Ports
- 3000: NodeCG Dashboard
- 9090: WebSocket-Server
- 80/443: Nginx (HTTP/HTTPS)
- 5432: PostgreSQL
- 6379: Redis
- 3001: Grafana
- 9091: Prometheus

---

## ☸️ Kubernetes Manifests

**Verzeichnis:** `kubernetes_manifests/`

Production-Ready Kubernetes-Konfigurationen.

### Dateien

#### 1. `deployment.yaml`
- **NodeCG Server Deployment** mit 3 Replicas
- **Init Containers** für Dependency-Checks
- **Horizontal Pod Autoscaler** (3-10 Replicas)
- **Pod Disruption Budget** für High Availability
- Health Checks (Readiness, Liveness, Startup)
- Resource Limits & Requests

#### 2. `service.yaml`
- **LoadBalancer Service** für externe Zugriffe
- **ClusterIP Service** für interne Kommunikation
- **Headless Service** für Pod-to-Pod
- Services für Postgres, Redis, Prometheus, Grafana

#### 3. `config.yaml`
- **ConfigMaps** für Application-Config
- **Secrets** für sensible Daten (DB-Credentials, JWT-Keys)
- Nginx-Konfiguration
- PostgreSQL Init-Scripts

#### 4. `pvc.yaml`
- **Persistent Volume Claims** für:
  - Bundles Storage (20GB)
  - Assets Storage (100GB)
  - PostgreSQL Data (50GB)
  - Redis Data (10GB)
  - Logs (20GB)
- Storage Classes für AWS, GCP, Azure
- Volume Snapshot Configuration

### Verwendung
```bash
# Namespace erstellen
kubectl create namespace nodecg-production

# Secrets erstellen (vorher anpassen!)
kubectl apply -f kubernetes_manifests/config.yaml

# Storage provisionieren
kubectl apply -f kubernetes_manifests/pvc.yaml

# Services deployen
kubectl apply -f kubernetes_manifests/service.yaml

# Application deployen
kubectl apply -f kubernetes_manifests/deployment.yaml

# Status prüfen
kubectl get pods -n nodecg-production
kubectl get services -n nodecg-production

# Logs anzeigen
kubectl logs -f deployment/nodecg-server -n nodecg-production
```

### Skalierung
```bash
# Manuell skalieren
kubectl scale deployment nodecg-server --replicas=5 -n nodecg-production

# HPA Status
kubectl get hpa -n nodecg-production
```

---

## 📝 Code Templates

**Verzeichnis:** `code_templates/`

Production-Ready Templates für Bundle-Entwicklung.

### 1. `bundle.config.js`
Vollständiges Konfigurations-Template mit:
- Bundle-Metadaten
- Graphics & Panels
- Replicants mit Schemas
- Assets-Kategorien
- Custom Routes
- Permissions

**Verwendung:**
```bash
cp code_templates/bundle.config.js bundles/my-bundle/bundle.config.js
```

### 2. `extension-template.js`
Server-seitiges Extension-Template mit:
- Replicant-Management
- Message-Handlers
- Asset-Integration
- External API-Calls
- Express-Routes
- Logging & Error-Handling

**Verwendung:**
```bash
cp code_templates/extension-template.js bundles/my-bundle/extension/index.js
```

### 3. `panel-template.html`
Dashboard-Panel-Template mit:
- Vollständiges UI-Framework
- Replicant-Synchronisation
- Message-Communication
- Form-Validierung
- Responsive Design

**Verwendung:**
```bash
cp code_templates/panel-template.html bundles/my-bundle/dashboard/panel.html
```

### 4. `graphic-template.html`
OBS-Overlay-Template mit:
- Transparenter Hintergrund für OBS
- Animations & Transitions
- Scoreboard-Display
- Lower Third
- Countdown-Timer
- Optimiert für 1920x1080

**Verwendung:**
```bash
cp code_templates/graphic-template.html bundles/my-bundle/graphics/overlay.html
```

---

## 🚀 Quick Start Guide

### Development Setup

1. **Datenbank vorbereiten:**
```bash
cd appendix
docker-compose up -d postgres redis
```

2. **Prisma initialisieren:**
```bash
cp prisma_schema.prisma ../prisma/schema.prisma
npx prisma migrate dev --name init
npx prisma generate
```

3. **Bundle erstellen:**
```bash
mkdir -p bundles/my-bundle/{extension,dashboard,graphics}
cp code_templates/bundle.config.js bundles/my-bundle/
cp code_templates/extension-template.js bundles/my-bundle/extension/index.js
cp code_templates/panel-template.html bundles/my-bundle/dashboard/panel.html
cp code_templates/graphic-template.html bundles/my-bundle/graphics/overlay.html
```

4. **NodeCG starten:**
```bash
npm run dev
```

### Production Deployment

#### Option A: Docker Compose
```bash
cd appendix
docker-compose -f docker-compose.yml up -d
```

#### Option B: Kubernetes
```bash
# Secrets anpassen!
kubectl create namespace nodecg-production
kubectl apply -f kubernetes_manifests/
```

---

## 📚 Weitere Ressourcen

- **Hauptdokumentation**: Siehe `../00_EXECUTIVE_SUMMARY_REBUILD.md`
- **Architektur-Design**: Siehe `../01_ARCHITECTURE_DESIGN.md`
- **Entwicklungs-Phasen**: Siehe `../02_DEVELOPMENT_PHASES.md`
- **Tech Stack**: Siehe `../03_TECH_STACK_DECISIONS.md`

---

## ⚠️ Wichtige Hinweise

### Secrets Management
**NIEMALS** produktive Secrets in Git committen!

Für Production verwenden:
- **Sealed Secrets**: https://github.com/bitnami-labs/sealed-secrets
- **External Secrets Operator**: https://external-secrets.io
- **HashiCorp Vault**: https://www.vaultproject.io
- **Cloud Provider Secrets**: AWS Secrets Manager, GCP Secret Manager

### Security Checklist
- [ ] Alle Default-Passwörter geändert
- [ ] JWT/Session-Secrets rotiert
- [ ] SSL/TLS-Zertifikate konfiguriert
- [ ] CORS Origins eingeschränkt
- [ ] Rate Limiting aktiviert
- [ ] Security Headers gesetzt
- [ ] Backup-Strategie implementiert

### Performance Tipps
- Redis für Session-Store verwenden
- PostgreSQL Connection Pooling aktivieren
- CDN für Static Assets
- Gzip/Brotli Compression
- HTTP/2 aktivieren
- Database-Indizes optimieren

---

**Version:** 1.0.0  
**Erstellt:** November 2025  
**Autor:** NodeCG Next Development Team
