/**
 * Bundle Content Routes
 * Serves dashboard panels and graphics from bundles
 */

import { FastifyInstance } from 'fastify';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { BundleManager } from '../../../services/bundle';

export async function bundleContentRoutes(fastify: FastifyInstance): Promise<void> {
  const bundleManager = (fastify as FastifyInstance & { bundleManager: BundleManager })
    .bundleManager;

  if (!bundleManager) {
    fastify.log.error('Bundle Manager not available!');
    return;
  }

  /**
   * Serve bundle dashboard panels
   */
  fastify.get('/bundles/:bundleName/dashboard/:panelFile', async (request, reply) => {
    const { bundleName, panelFile } = request.params as { bundleName: string; panelFile: string };

    try {
      const bundle = bundleManager.get(bundleName);

      if (!bundle) {
        reply.code(404).send({ error: `Bundle ${bundleName} not found` });
        return;
      }

      const filePath = join(bundle.dir, 'dashboard', panelFile);
      const content = await readFile(filePath, 'utf-8');

      // Inject NodeCG client script if HTML
      if (panelFile.endsWith('.html')) {
        const injectedContent = content.replace(
          '</head>',
          `
  <script>
    // NodeCG client mock for dashboard panel
    window.nodecg = {
      bundleName: '${bundleName}',
      bundleVersion: '${bundle.config.version}',
      Replicant: function(name, opts = {}) {
        const replicant = {
          name: name,
          value: opts.defaultValue,
          on: function(event, callback) {
            console.log(\`[NodeCG] Replicant \${name}:\${event}\`);
            this._callbacks = this._callbacks || {};
            this._callbacks[event] = this._callbacks[event] || [];
            this._callbacks[event].push(callback);
            return () => {
              const index = this._callbacks[event].indexOf(callback);
              if (index > -1) this._callbacks[event].splice(index, 1);
            };
          }
        };
        return replicant;
      },
      sendMessage: function(name, data) {
        console.log('[NodeCG] sendMessage:', name, data);
        return Promise.resolve();
      },
      log: {
        info: function(...args) { console.log('[NodeCG]', ...args); },
        warn: function(...args) { console.warn('[NodeCG]', ...args); },
        error: function(...args) { console.error('[NodeCG]', ...args); },
        debug: function(...args) { console.debug('[NodeCG]', ...args); },
      }
    };
  </script>
</head>
            `
        );

        reply.type('text/html').send(injectedContent);
      } else {
        reply.send(content);
      }
    } catch (error) {
      fastify.log.error(
        `Error serving dashboard panel ${bundleName}/${panelFile}: ${(error as Error).message}`
      );
      reply.code(500).send({
        error: 'Failed to serve dashboard panel',
        details: (error as Error).message,
      });
    }
  });

  /**
   * Serve bundle graphics
   */
  fastify.get('/bundles/:bundleName/graphics/:graphicFile', async (request, reply) => {
    const { bundleName, graphicFile } = request.params as {
      bundleName: string;
      graphicFile: string;
    };

    try {
      const bundle = bundleManager.get(bundleName);

      if (!bundle) {
        reply.code(404).send({ error: `Bundle ${bundleName} not found` });
        return;
      }

      const filePath = join(bundle.dir, 'graphics', graphicFile);
      const content = await readFile(filePath, 'utf-8');

      // Inject NodeCG client script if HTML
      if (graphicFile.endsWith('.html')) {
        const injectedContent = content.replace(
          '</head>',
          `
  <script>
    // NodeCG client mock for graphic
    window.nodecg = {
      bundleName: '${bundleName}',
      bundleVersion: '${bundle.config.version}',
      Replicant: function(name, opts = {}) {
        const replicant = {
          name: name,
          value: opts.defaultValue,
          on: function(event, callback) {
            console.log(\`[NodeCG] Replicant \${name}:\${event}\`);
            this._callbacks = this._callbacks || {};
            this._callbacks[event] = this._callbacks[event] || [];
            this._callbacks[event].push(callback);
            return () => {
              const index = this._callbacks[event].indexOf(callback);
              if (index > -1) this._callbacks[event].splice(index, 1);
            };
          }
        };
        return replicant;
      },
      log: {
        info: function(...args) { console.log('[NodeCG]', ...args); },
        warn: function(...args) { console.warn('[NodeCG]', ...args); },
        error: function(...args) { console.error('[NodeCG]', ...args); },
        debug: function(...args) { console.debug('[NodeCG]', ...args); },
      }
    };
  </script>
</head>
            `
        );

        reply.type('text/html').send(injectedContent);
      } else {
        reply.send(content);
      }
    } catch (error) {
      fastify.log.error(
        `Error serving graphic ${bundleName}/${graphicFile}: ${(error as Error).message}`
      );
      reply.code(500).send({
        error: 'Failed to serve graphic',
        details: (error as Error).message,
      });
    }
  });

  /**
   * List bundle panels
   */
  fastify.get('/bundles/panels', async (_request, reply) => {
    try {
      const bundles = bundleManager.getAll();
      const panels = bundles.flatMap((bundle) => {
        const dashboardPanels = bundle.config.nodecg?.dashboardPanels || [];
        return dashboardPanels.map((panel) => ({
          bundleName: bundle.config.name,
          bundleVersion: bundle.config.version,
          ...panel,
          url: `/bundles/${bundle.config.name}/dashboard/${panel.file}`,
        }));
      });

      reply.send({ panels });
    } catch (error) {
      fastify.log.error(`Error listing panels: ${(error as Error).message}`);
      reply.code(500).send({
        error: 'Failed to list panels',
        details: (error as Error).message,
      });
    }
  });

  /**
   * List bundle graphics
   */
  fastify.get('/bundles/graphics', async (_request, reply) => {
    try {
      const bundles = bundleManager.getAll();
      const graphics = bundles.flatMap((bundle) => {
        const bundleGraphics = bundle.config.nodecg?.graphics || [];
        return bundleGraphics.map((graphic) => ({
          bundleName: bundle.config.name,
          bundleVersion: bundle.config.version,
          ...graphic,
          url: `/bundles/${bundle.config.name}/graphics/${graphic.file}`,
        }));
      });

      reply.send({ graphics });
    } catch (error) {
      fastify.log.error(`Error listing graphics: ${(error as Error).message}`);
      reply.code(500).send({
        error: 'Failed to list graphics',
        details: (error as Error).message,
      });
    }
  });

  fastify.log.info('Bundle content routes registered');
}
