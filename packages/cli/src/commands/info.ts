/**
 * Info Command
 * Displays system information
 */

import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function infoCommand(): Promise<void> {
  // Get package versions
  const cliPackage = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

  console.log();
  console.log(chalk.blue.bold('NodeCG Next - System Information'));
  console.log(chalk.gray('='.repeat(60)));
  console.log();

  // NodeCG Information
  console.log(chalk.cyan.bold('NodeCG Next:'));
  console.log(`  Version:        ${chalk.green(cliPackage.version)}`);
  console.log(`  CLI Package:    ${chalk.gray(cliPackage.name)}`);
  console.log();

  // System Information
  console.log(chalk.cyan.bold('System:'));
  console.log(`  Platform:       ${chalk.green(os.platform())} ${os.arch()}`);
  console.log(`  OS:             ${chalk.green(os.type())} ${os.release()}`);
  const cpus = os.cpus();
  console.log(`  CPU:            ${chalk.green(cpus[0]?.model || 'Unknown')}`);
  console.log(`  CPU Cores:      ${chalk.green(cpus.length)}`);
  console.log(`  Memory:         ${chalk.green(formatBytes(os.totalmem()))} total`);
  console.log(`  Free Memory:    ${chalk.green(formatBytes(os.freemem()))}`);
  console.log(`  Hostname:       ${chalk.green(os.hostname())}`);
  console.log();

  // Node.js Information
  console.log(chalk.cyan.bold('Node.js:'));
  console.log(`  Version:        ${chalk.green(process.version)}`);
  console.log(`  V8 Version:     ${chalk.green(process.versions.v8)}`);
  console.log(`  Executable:     ${chalk.gray(process.execPath)}`);
  console.log();

  // Environment
  console.log(chalk.cyan.bold('Environment:'));
  console.log(`  NODE_ENV:       ${chalk.green(process.env.NODE_ENV || 'not set')}`);
  console.log(`  Working Dir:    ${chalk.gray(process.cwd())}`);
  console.log(`  User:           ${chalk.green(os.userInfo().username)}`);
  console.log(`  Home:           ${chalk.gray(os.homedir())}`);
  console.log();

  // Uptime
  console.log(chalk.cyan.bold('Uptime:'));
  console.log(`  System:         ${chalk.green(formatUptime(os.uptime()))}`);
  console.log(`  Process:        ${chalk.green(formatUptime(process.uptime()))}`);
  console.log();

  console.log(chalk.gray('='.repeat(60)));
  console.log();
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format uptime to human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
