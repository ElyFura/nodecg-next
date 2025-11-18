/**
 * ============================================================================
 * NODECG NEXT - BUNDLE CONFIGURATION TEMPLATE
 * ============================================================================
 * Datei: bundle.config.js
 * Beschreibung: Konfigurations-Template für NodeCG Next Bundles
 *
 * Dieses Template zeigt alle verfügbaren Konfigurationsoptionen für
 * NodeCG Next Bundles mit ausführlichen Kommentaren und Beispielen.
 *
 * @author NodeCG Next Development Team
 * @version 1.0.0
 * ============================================================================
 */

module.exports = {
  /**
   * =========================================================================
   * BUNDLE METADATA
   * =========================================================================
   * Grundlegende Informationen über das Bundle
   */

  // Eindeutiger Bundle-Name (kebab-case, lowercase)
  name: 'my-awesome-bundle',

  // Anzeigename im Dashboard
  displayName: 'My Awesome Bundle',

  // Semantic Versioning (https://semver.org)
  version: '1.0.0',

  // Kurze Beschreibung des Bundle-Zwecks
  description: 'Ein umfassendes NodeCG-Bundle für Live-Produktionen',

  // Bundle-Autor
  author: {
    name: 'Your Name',
    email: 'your.email@example.com',
    url: 'https://yourwebsite.com',
  },

  // Homepage und Repository
  homepage: 'https://github.com/yourusername/my-awesome-bundle',
  repository: {
    type: 'git',
    url: 'https://github.com/yourusername/my-awesome-bundle.git',
  },

  // Lizenz (SPDX-Format)
  license: 'MIT',

  /**
   * =========================================================================
   * NODECG COMPATIBILITY
   * =========================================================================
   */

  // Kompatible NodeCG-Version (Semantic Versioning Range)
  nodecgVersion: '^2.0.0',

  /**
   * =========================================================================
   * BUNDLE STRUCTURE
   * =========================================================================
   * Definition von Grafiken, Panels und anderen Bundle-Ressourcen
   */

  /**
   * GRAPHICS
   * HTML-Seiten für OBS/Broadcast-Overlays
   */
  graphics: [
    {
      // Eindeutiger Grafik-Name
      file: 'scoreboard.html',

      // Anzeigename im Dashboard
      title: 'Main Scoreboard',

      // Auflösung (OBS Virtual Cam Browser Source)
      width: 1920,
      height: 1080,

      // Kategorisierung für Dashboard
      category: 'Main Graphics',

      // Single Instance (nur einmal laden)
      singleInstance: true,

      // Beschreibung
      description: 'Haupt-Scoreboard für Live-Stream',
    },
    {
      file: 'lower-third.html',
      title: 'Lower Third',
      width: 1920,
      height: 200,
      category: 'Overlays',
      singleInstance: false,
    },
    {
      file: 'countdown.html',
      title: 'Stream Countdown',
      width: 1280,
      height: 720,
      category: 'Utilities',
    },
  ],

  /**
   * PANELS
   * Dashboard-Panels für Bundle-Kontrolle
   */
  panels: [
    {
      // Eindeutiger Panel-Name
      name: 'control',
      file: 'control-panel.html',

      // Anzeigename im Dashboard
      title: 'Main Control Panel',

      // Panel-Breite in Grid-Einheiten (1-12)
      width: 6,

      // Workspace-Zuweisung
      workspace: 'Main',

      // Header-Farbe (Hex)
      headerColor: '#3498db',

      // Benötigte Rolle für Zugriff
      role: 'operator',
    },
    {
      name: 'settings',
      file: 'settings-panel.html',
      title: 'Bundle Settings',
      width: 4,
      workspace: 'Settings',
      headerColor: '#e74c3c',
      role: 'admin',
    },
    {
      name: 'scoreboard',
      file: 'scoreboard-panel.html',
      title: 'Scoreboard Control',
      width: 8,
      workspace: 'Main',
    },
  ],

  /**
   * =========================================================================
   * REPLICANTS
   * =========================================================================
   * Deklaration von Replicants mit Schemas und Defaults
   */

  replicants: [
    {
      // Replicant-Name
      name: 'currentScore',

      // Default-Wert
      defaultValue: {
        teamA: 0,
        teamB: 0,
        quarter: 1,
      },

      // JSON-Schema für Validierung
      schema: {
        type: 'object',
        properties: {
          teamA: { type: 'number', minimum: 0 },
          teamB: { type: 'number', minimum: 0 },
          quarter: { type: 'number', minimum: 1, maximum: 4 },
        },
        required: ['teamA', 'teamB', 'quarter'],
      },

      // Persistierung aktivieren
      persistent: true,

      // Persistierungs-Intervall (Millisekunden)
      persistenceInterval: 5000,
    },
    {
      name: 'participants',
      defaultValue: [],
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            team: { type: 'string', enum: ['A', 'B'] },
          },
        },
      },
      persistent: true,
    },
    {
      name: 'streamStatus',
      defaultValue: {
        isLive: false,
        startedAt: null,
        viewers: 0,
      },
      persistent: false, // Nicht persistieren (flüchtige Daten)
    },
  ],

  /**
   * =========================================================================
   * ASSETS
   * =========================================================================
   * Asset-Kategorien für Datei-Uploads
   */

  assets: [
    {
      // Kategorie-Name
      name: 'logos',

      // Anzeigename
      title: 'Team Logos',

      // Erlaubte MIME-Types
      allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],

      // Maximale Dateigröße in Bytes (10MB)
      maxSize: 10485760,

      // Beschreibung
      description: 'Logos für Teams und Sponsoren',
    },
    {
      name: 'sounds',
      title: 'Sound Effects',
      allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      maxSize: 5242880, // 5MB
    },
    {
      name: 'videos',
      title: 'Video Clips',
      allowedTypes: ['video/mp4', 'video/webm'],
      maxSize: 104857600, // 100MB
    },
  ],

  /**
   * =========================================================================
   * BUNDLE CONFIGURATION SCHEMA
   * =========================================================================
   * Schema für Bundle-spezifische Konfiguration in cfg/bundle.json
   */

  configSchema: {
    type: 'object',
    properties: {
      // API-Konfiguration
      api: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          baseUrl: { type: 'string', format: 'uri' },
          apiKey: { type: 'string' },
          timeout: { type: 'number', default: 30000 },
        },
      },

      // Broadcast-Einstellungen
      broadcast: {
        type: 'object',
        properties: {
          overlayOpacity: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 1.0,
          },
          transitionDuration: {
            type: 'number',
            default: 300,
          },
          defaultScene: {
            type: 'string',
            enum: ['main', 'intermission', 'countdown'],
            default: 'main',
          },
        },
      },

      // Feature-Flags
      features: {
        type: 'object',
        properties: {
          enableChatIntegration: { type: 'boolean', default: false },
          enableSocialMedia: { type: 'boolean', default: false },
          enableAnalytics: { type: 'boolean', default: true },
        },
      },
    },
  },

  /**
   * =========================================================================
   * MOUNT POINTS
   * =========================================================================
   * Zusätzliche Express-Mount-Points für Custom-Routes
   */

  mount: [
    {
      // Route-Pfad
      path: '/webhook',

      // Handler-Datei (relativ zu extension/)
      handler: 'webhook-handler.js',

      // Benötigte Rolle
      role: 'operator',
    },
    {
      path: '/api/custom',
      handler: 'api-routes.js',
      role: 'viewer',
    },
  ],

  /**
   * =========================================================================
   * DEPENDENCIES
   * =========================================================================
   * Bundle-Dependencies (andere NodeCG-Bundles)
   */

  bundleDependencies: {
    // Required Dependencies
    'nodecg-utility-bundles': '^1.0.0',

    // Optional Dependencies
    optional: {
      'nodecg-obs-control': '^2.0.0',
    },
  },

  /**
   * =========================================================================
   * PERMISSIONS
   * =========================================================================
   * Spezielle Permissions die das Bundle benötigt
   */

  permissions: ['replicants:write', 'messages:send', 'assets:upload', 'bundles:read'],

  /**
   * =========================================================================
   * EXTENSION CONFIGURATION
   * =========================================================================
   */

  extension: {
    // Entry-Point für Extension
    main: 'index.js',

    // Auto-Load beim Startup
    autoLoad: true,

    // Restart bei Änderungen (Development)
    hotReload: false,
  },

  /**
   * =========================================================================
   * DASHBOARD CONFIGURATION
   * =========================================================================
   */

  dashboard: {
    // Dashboard-Theme
    theme: {
      primaryColor: '#3498db',
      accentColor: '#2ecc71',
    },

    // Custom CSS
    customCSS: 'styles/dashboard.css',
  },

  /**
   * =========================================================================
   * DEVELOPMENT SETTINGS
   * =========================================================================
   */

  development: {
    // Source Maps aktivieren
    sourceMaps: true,

    // Live-Reload für Grafiken
    liveReload: true,

    // Debug-Logging
    verbose: false,
  },

  /**
   * =========================================================================
   * CONTRIBUTION GUIDELINES
   * =========================================================================
   */

  contributing: {
    url: 'https://github.com/yourusername/my-awesome-bundle/blob/main/CONTRIBUTING.md',
  },

  /**
   * =========================================================================
   * KEYWORDS
   * =========================================================================
   * Für Bundle-Discovery und -Suche
   */

  keywords: ['nodecg', 'broadcast', 'overlay', 'streaming', 'esports', 'scoreboard'],

  /**
   * =========================================================================
   * COMPATIBILITY INFORMATION
   * =========================================================================
   */

  compatibility: {
    obs: '^28.0.0',
    browsers: ['chrome >= 90', 'firefox >= 88', 'edge >= 90'],
  },
};
