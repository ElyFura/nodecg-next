/**
 * CLI Dev Command
 * Starts development server with hot module replacement
 */

import { spawn, ChildProcess } from 'child_process';
import { watch } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

export interface DevOptions {
  port?: string;
  host?: string;
}

let serverProcess: ChildProcess | null = null;
let viteProcess: ChildProcess | null = null;

/**
 * Dev command handler
 */
export async function devCommand(options: DevOptions = {}): Promise<void> {
  const port = options.port || '3000';
  const host = options.host || 'localhost';

  console.log(chalk.blue.bold('\n🚀 Starting NodeCG Development Server\n'));
  console.log(chalk.cyan(`  Server: http://${host}:${port}`));
  console.log(chalk.cyan(`  Hot Reload: Enabled\n`));

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log(chalk.yellow('\n\n📦 Shutting down development server...'));

    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }

    if (viteProcess) {
      viteProcess.kill('SIGTERM');
      viteProcess = null;
    }

    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Start Vite dev server for bundles (if vite.config exists)
    await startViteServer();

    // Start NodeCG server with hot reload
    await startNodeCGServer(port, host);

    // Watch for file changes
    await watchBundles();

    // Keep process alive
    await new Promise(() => {
      // Intentionally empty - process runs until killed
    });
  } catch (error) {
    console.error(chalk.red('Failed to start development server:'), error);
    await cleanup();
    process.exit(1);
  }
}

/**
 * Start Vite development server
 */
async function startViteServer(): Promise<void> {
  return new Promise((resolve) => {
    console.log(chalk.cyan('📦 Starting Vite dev server...'));

    viteProcess = spawn('npx', ['vite', '--port', '5173', '--host'], {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd(),
    });

    if (viteProcess.stdout) {
      viteProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Local:') || output.includes('ready in')) {
          console.log(chalk.green('  ✓ Vite server ready'));
          resolve();
        }
        // Only log important messages
        if (output.includes('ready in') || output.includes('error') || output.includes('Error')) {
          console.log(chalk.gray(`  [Vite] ${output.trim()}`));
        }
      });
    }

    if (viteProcess.stderr) {
      viteProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!output.includes('deprecated')) {
          console.error(chalk.red(`  [Vite Error] ${output.trim()}`));
        }
      });
    }

    viteProcess.on('error', (error) => {
      console.error(chalk.red('Failed to start Vite:'), error);
      // Vite is optional, continue without it
      resolve();
    });

    viteProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(chalk.yellow(`Vite exited with code ${code}`));
      }
    });

    // Don't wait forever for Vite
    globalThis.setTimeout(() => {
      if (!viteProcess) {
        console.log(chalk.gray('  ⓘ Vite not found, continuing without it'));
      }
      resolve();
    }, 3000);
  });
}

/**
 * Start NodeCG server
 */
async function startNodeCGServer(port: string, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan('\n🎮 Starting NodeCG server...'));

    // Check if we're in a bundle directory or nodecg root
    const cwd = process.cwd();

    serverProcess = spawn('node', ['--watch', 'dist/index.js'], {
      stdio: 'pipe',
      shell: true,
      cwd,
      env: {
        ...process.env,
        PORT: port,
        HOST: host,
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
      },
    });

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(chalk.gray(`  [NodeCG] ${output.trim()}`));

        if (output.includes('Server listening') || output.includes('ready')) {
          console.log(chalk.green('\n✓ NodeCG server ready!\n'));
          resolve();
        }
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        // Filter out common warnings
        if (!output.includes('ExperimentalWarning') && !output.includes('deprecated')) {
          console.error(chalk.red(`  [NodeCG Error] ${output.trim()}`));
        }
      });
    }

    serverProcess.on('error', (error) => {
      console.error(chalk.red('Failed to start NodeCG server:'), error);
      reject(error);
    });

    serverProcess.on('exit', (code, signal) => {
      if (signal !== 'SIGTERM' && code !== 0 && code !== null) {
        console.error(chalk.red(`NodeCG server exited with code ${code}`));
      }
    });

    // Timeout if server doesn't start
    globalThis.setTimeout(() => {
      console.log(chalk.green('\n✓ NodeCG server starting (waiting for confirmation)...\n'));
      resolve();
    }, 2000);
  });
}

/**
 * Watch bundles directory for changes
 */
async function watchBundles(): Promise<void> {
  console.log(chalk.cyan('👀 Watching for file changes...\n'));

  const bundlesDir = join(process.cwd(), 'bundles');

  try {
    const watcher = watch(bundlesDir, { recursive: true });

    for await (const event of watcher) {
      if (event.filename) {
        // Filter out unwanted files
        if (
          event.filename.includes('node_modules') ||
          event.filename.includes('.git') ||
          event.filename.includes('dist') ||
          event.filename.includes('.DS_Store')
        ) {
          continue;
        }

        console.log(chalk.yellow(`  ⟳ File changed: ${event.filename}`));
        console.log(chalk.gray('  Server will auto-restart...\n'));
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.log(chalk.gray('  ⓘ No bundles directory found, skipping file watching'));
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(chalk.yellow('Warning: Could not watch bundles directory:'), message);
    }
  }
}
