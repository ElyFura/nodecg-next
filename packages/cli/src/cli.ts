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

/**
 * Create command - create a new bundle from template
 */
program
  .command('create [name]')
  .description('Create a new NodeCG bundle from template')
  .option('-t, --template <template>', 'Template to use (react-ts|vue-ts|minimal-ts|minimal-js)')
  .option('-d, --description <description>', 'Bundle description')
  .option('-a, --author <author>', 'Author name')
  .option('--no-git', 'Skip git initialization')
  .action(async (name, options) => {
    try {
      const { createCommand } = await import('./commands/create.js');
      await createCommand(name, options);
    } catch (error) {
      console.error(chalk.red('Failed to create bundle:'), error);
      process.exit(1);
    }
  });

/**
 * Dev command - start development server with hot reload
 */
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    try {
      const { devCommand } = await import('./commands/dev.js');
      await devCommand(options);
    } catch (error) {
      console.error(chalk.red('Failed to start dev server:'), error);
      process.exit(1);
    }
  });

/**
 * Build command - build bundles for production
 */
program
  .command('build')
  .description('Build bundles for production')
  .option('--bundle <name>', 'Build specific bundle')
  .option('--all', 'Build all bundles')
  .action(async (options) => {
    try {
      const { buildCommand } = await import('./commands/build.js');
      await buildCommand(options);
    } catch (error) {
      console.error(chalk.red('Failed to build:'), error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
