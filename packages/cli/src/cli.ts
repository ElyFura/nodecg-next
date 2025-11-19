#!/usr/bin/env node

/**
 * NodeCG CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('nodecg')
  .description('NodeCG Next - Modern Broadcast Graphics Framework')
  .version(packageJson.version);

/**
 * Start command - start the NodeCG server
 */
program
  .command('start')
  .description('Start the NodeCG server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--log-level <level>', 'Log level (trace|debug|info|warn|error|fatal)', 'info')
  .action(async (options) => {
    console.log(chalk.blue.bold('Starting NodeCG Next server...'));

    try {
      const { startCommand } = await import('./commands/start.js');
      await startCommand(options);
    } catch (error) {
      console.error(chalk.red('Failed to start server:'), error);
      process.exit(1);
    }
  });

/**
 * Info command - show system information
 */
program
  .command('info')
  .description('Show system information')
  .action(async () => {
    try {
      const { infoCommand } = await import('./commands/info.js');
      await infoCommand();
    } catch (error) {
      console.error(chalk.red('Failed to show info:'), error);
      process.exit(1);
    }
  });

// TODO: Implement additional commands
// - init: Initialize new NodeCG installation
// - bundle: Manage bundles (create, list, install, remove)
// - config: Manage configuration (show, validate)
// - db: Database operations (migrate, seed, reset)
// - dev: Development server with hot reload

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
