/**
 * Dashboard HTTP Routes
 * Serves the web dashboard interface
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getRepositories } from '../../../database/client';
import { createLogger } from '../../../utils/logger';
import { BundleManager } from '../../../services/bundle';

const logger = createLogger({ level: 'info' });

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  const repos = getRepositories(logger);
  const bundleManager = (fastify as FastifyInstance & { bundleManager: BundleManager })
    .bundleManager;

  /**
   * Main Dashboard - Shows bundle panels
   */
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Get all bundles with dashboard panels
    const bundles = bundleManager ? bundleManager.getAll() : [];
    const panels: Array<{
      bundleName: string;
      bundleVersion: string;
      name: string;
      title: string;
      width: number;
      file: string;
      url: string;
    }> = [];

    for (const bundle of bundles) {
      const config = bundle.config;
      if (config.nodecg?.dashboardPanels) {
        for (const panel of config.nodecg.dashboardPanels) {
          panels.push({
            bundleName: config.name,
            bundleVersion: config.version,
            name: panel.name,
            title: panel.title,
            width: panel.width || 1,
            file: panel.file,
            url: `/bundles/${config.name}/dashboard/${panel.file}`,
          });
        }
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeCG Next - Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f0f2f5;
      color: #333;
      min-height: 100vh;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 1.8em;
      font-weight: 600;
    }

    .header-nav {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .header-link {
      color: white;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 5px;
      transition: background 0.2s;
      font-weight: 500;
    }

    .header-link:hover {
      background: rgba(255,255,255,0.2);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.9em;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Main Content */
    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 30px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.5em;
      color: #333;
      font-weight: 600;
    }

    .bundle-count {
      color: #666;
      font-size: 0.95em;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .empty-state-icon {
      font-size: 4em;
      margin-bottom: 20px;
    }

    .empty-state h2 {
      font-size: 1.5em;
      color: #333;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.6;
    }

    .empty-state-link {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .empty-state-link:hover {
      background: #5568d3;
    }

    /* Panel Grid */
    .panel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .panel-card {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .panel-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .panel-card.width-2 {
      grid-column: span 2;
    }

    .panel-card.width-3 {
      grid-column: span 3;
    }

    @media (max-width: 1200px) {
      .panel-card.width-2,
      .panel-card.width-3 {
        grid-column: span 1;
      }
    }

    .panel-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title {
      font-weight: 600;
      font-size: 1.1em;
    }

    .panel-bundle {
      font-size: 0.85em;
      opacity: 0.9;
    }

    .panel-content {
      height: 400px;
      overflow: hidden;
      position: relative;
    }

    .panel-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .panel-actions {
      padding: 10px 20px;
      background: #f9fafb;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .panel-btn {
      padding: 6px 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      text-decoration: none;
      display: inline-block;
      transition: background 0.2s;
    }

    .panel-btn:hover {
      background: #5568d3;
    }

    .panel-btn.secondary {
      background: #6b7280;
    }

    .panel-btn.secondary:hover {
      background: #4b5563;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>📺 NodeCG Dashboard</h1>
    <div class="header-nav">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>Online</span>
      </div>
      <a href="/status" class="header-link">System Status</a>
      <a href="/bundles/graphics" class="header-link">Graphics</a>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container">
    ${
      panels.length === 0
        ? `
    <div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <h2>No Dashboard Panels Available</h2>
      <p>
        No bundles with dashboard panels are currently loaded.<br>
        Create a bundle with dashboard panels to get started!
      </p>
      <a href="/status" class="empty-state-link">View System Status</a>
    </div>
    `
        : `
    <div class="section-header">
      <h2 class="section-title">Dashboard Panels</h2>
      <span class="bundle-count">${panels.length} panel${panels.length !== 1 ? 's' : ''} from ${bundles.length} bundle${bundles.length !== 1 ? 's' : ''}</span>
    </div>

    <div class="panel-grid">
      ${panels
        .map(
          (panel) => `
      <div class="panel-card ${panel.width > 1 ? `width-${panel.width}` : ''}">
        <div class="panel-header">
          <div>
            <div class="panel-title">${panel.title}</div>
            <div class="panel-bundle">${panel.bundleName} v${panel.bundleVersion}</div>
          </div>
        </div>
        <div class="panel-content">
          <iframe
            src="${panel.url}"
            class="panel-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
          ></iframe>
        </div>
        <div class="panel-actions">
          <a href="${panel.url}" target="_blank" class="panel-btn secondary">Open in New Tab</a>
        </div>
      </div>
      `
        )
        .join('')}
    </div>
    `
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>NodeCG Next v0.1.0 - Modern Broadcast Graphics Framework</p>
  </div>

  <script>
    // Auto-refresh panel list every 30 seconds to detect new bundles
    setTimeout(() => {
      window.location.reload();
    }, 30000);

    // Listen for bundle updates via localStorage/events
    window.addEventListener('storage', (e) => {
      if (e.key === 'nodecg:bundles:updated') {
        window.location.reload();
      }
    });
  </script>
</body>
</html>
    `;

    reply.type('text/html').send(html);
  });

  /**
   * System Status Page - Moved from root
   */
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeCG Next - System Status</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      font-size: 2.5em;
      color: #667eea;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 1.1em;
    }
    .header-actions {
      display: flex;
      gap: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    }
    .card h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    .card p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .card ul {
      list-style: none;
      margin-bottom: 15px;
    }
    .card li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      color: #555;
    }
    .card li:last-child {
      border-bottom: none;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.2s;
      font-weight: 500;
    }
    .button:hover {
      background: #5568d3;
    }
    .button.secondary {
      background: #6b7280;
    }
    .button.secondary:hover {
      background: #4b5563;
    }
    .status {
      display: inline-block;
      padding: 5px 12px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 500;
    }
    .status.offline {
      background: #ef4444;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 15px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f9fafb;
      border-radius: 5px;
    }
    .info-label {
      font-weight: 600;
      color: #667eea;
    }
    .info-value {
      color: #555;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>NodeCG Next</h1>
        <p class="subtitle">System Status & Information</p>
        <div style="margin-top: 15px;">
          <span class="status" id="status">Online</span>
        </div>
      </div>
      <div class="header-actions">
        <a href="/" class="button">← Dashboard</a>
        <a href="/bundles/panels" class="button secondary">Panels API</a>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>📡 WebSocket Namespaces</h2>
        <p>Real-time communication channels available:</p>
        <ul>
          <li><strong>/dashboard</strong> - Dashboard controls (auth required)</li>
          <li><strong>/graphics</strong> - Graphics overlays (optional auth)</li>
          <li><strong>/extension</strong> - Extension API (optional auth)</li>
        </ul>
        <p style="margin-top: 15px; font-size: 0.9em; color: #888;">
          Connect using Socket.IO client library
        </p>
      </div>

      <div class="card">
        <h2>🔌 REST API Endpoints</h2>
        <p>HTTP API available at <code>/api</code>:</p>
        <ul>
          <li><strong>GET</strong> /api/replicants</li>
          <li><strong>GET</strong> /api/bundles</li>
          <li><strong>GET</strong> /api/assets</li>
          <li><strong>GET</strong> /bundles/panels</li>
          <li><strong>GET</strong> /bundles/graphics</li>
        </ul>
        <a href="/api/replicants/namespaces" class="button" style="margin-top: 10px;">View API</a>
      </div>

      <div class="card">
        <h2>📦 System Status</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Uptime</span>
            <span class="info-value" id="uptime">Loading...</span>
          </div>
          <div class="info-item">
            <span class="info-label">Memory</span>
            <span class="info-value" id="memory">Loading...</span>
          </div>
          <div class="info-item">
            <span class="info-label">Bundles</span>
            <span class="info-value" id="bundles">Loading...</span>
          </div>
          <div class="info-item">
            <span class="info-label">Connections</span>
            <span class="info-value" id="connections">0</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>📚 Documentation</h2>
        <p>Quick links to get started:</p>
        <ul>
          <li><a href="/health" style="color: #667eea;">Health Check</a></li>
          <li><a href="/api/replicants/namespaces" style="color: #667eea;">Replicants API</a></li>
          <li><a href="/api/bundles" style="color: #667eea;">Bundles API</a></li>
          <li><a href="/api/assets" style="color: #667eea;">Assets API</a></li>
        </ul>
      </div>

      <div class="card">
        <h2>🚀 Quick Start</h2>
        <p>Connect to the dashboard WebSocket:</p>
        <pre style="background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 0.85em;"><code>import io from 'socket.io-client';

const socket = io('ws://localhost:3000/dashboard', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected!');
});</code></pre>
      </div>

      <div class="card">
        <h2>⚙️ Configuration</h2>
        <p>Current server configuration:</p>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Host</span>
            <span class="info-value" id="host">Loading...</span>
          </div>
          <div class="info-item">
            <span class="info-label">Port</span>
            <span class="info-value" id="port">Loading...</span>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <p>NodeCG Next v0.1.0 - Built with Fastify, Socket.IO, and TypeScript</p>
    </footer>
  </div>

  <script>
    // Update system status
    function updateStatus() {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => {
          // Update uptime
          const uptimeSeconds = data.uptime || 0;
          const hours = Math.floor(uptimeSeconds / 3600);
          const minutes = Math.floor((uptimeSeconds % 3600) / 60);
          document.getElementById('uptime').textContent =
            hours > 0 ? \`\${hours}h \${minutes}m\` : \`\${minutes}m\`;

          // Update memory
          const memoryMB = Math.round((data.memory?.heapUsed || 0) / 1024 / 1024);
          document.getElementById('memory').textContent = \`\${memoryMB} MB\`;

          // Update host and port
          document.getElementById('host').textContent = data.config?.host || 'localhost';
          document.getElementById('port').textContent = data.config?.port || 3000;
        })
        .catch(err => {
          console.error('Failed to fetch status:', err);
          document.getElementById('status').textContent = 'Offline';
          document.getElementById('status').classList.add('offline');
        });

      // Get bundle count
      fetch('/api/bundles')
        .then(res => res.json())
        .then(data => {
          document.getElementById('bundles').textContent = data.bundles?.length || 0;
        })
        .catch(err => console.error('Failed to fetch bundles:', err));
    }

    // Update status on load and every 5 seconds
    updateStatus();
    setInterval(updateStatus, 5000);

    // Try to connect to dashboard WebSocket to count connections
    try {
      const socket = io('/dashboard', {
        transports: ['websocket', 'polling']
      });
      socket.on('connect', () => {
        document.getElementById('connections').textContent = '1+';
      });
    } catch (err) {
      console.log('Socket.IO not available in browser context');
    }
  </script>
</body>
</html>
    `;

    reply.type('text/html').send(html);
  });

  /**
   * System status endpoint
   */
  fastify.get('/api/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bundles = await repos.bundle.findMany();

      reply.send({
        status: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {
          host: request.hostname,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          port: (request.server.addresses()[0] as any)?.port || 3000,
        },
        bundles: {
          total: bundles.length,
          enabled: bundles.filter((b) => b.enabled).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting system status:', error);
      reply.code(500).send({
        error: 'Failed to get system status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('Dashboard routes registered');
}
