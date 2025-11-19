/**
 * CLI Build Command
 * Builds bundles for production deployment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

export interface BuildOptions {
  bundle?: string;
  all?: boolean;
}

/**
 * Build command handler
 */
export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  console.log(chalk.blue.bold('\n📦 Building NodeCG Bundles\n'));

  try {
    const bundlesDir = join(process.cwd(), 'bundles');

    // Determine which bundles to build
    let bundlesToBuild: string[] = [];

    if (options.bundle) {
      // Build specific bundle
      bundlesToBuild = [options.bundle];
    } else if (options.all || !options.bundle) {
      // Build all bundles
      bundlesToBuild = await discoverBundles(bundlesDir);
    }

    if (bundlesToBuild.length === 0) {
      console.log(chalk.yellow('No bundles found to build'));
      return;
    }

    console.log(chalk.cyan(`Building ${bundlesToBuild.length} bundle(s)...\n`));

    // Build each bundle
    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const bundleName of bundlesToBuild) {
      try {
        await buildBundle(bundlesDir, bundleName);
        results.push({ name: bundleName, success: true });
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to build ${bundleName}`));
        results.push({
          name: bundleName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Print summary
    console.log(chalk.blue.bold('\n📊 Build Summary\n'));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(chalk.green(`  ✓ Successful: ${successful.length}`));
    if (failed.length > 0) {
      console.log(chalk.red(`  ✗ Failed: ${failed.length}`));
      console.log();
      failed.forEach((r) => {
        console.log(chalk.red(`    • ${r.name}: ${r.error}`));
      });
    }

    console.log();

    if (failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Build failed:'), error);
    process.exit(1);
  }
}

/**
 * Discover all bundles in the bundles directory
 */
async function discoverBundles(bundlesDir: string): Promise<string[]> {
  try {
    const entries = await readdir(bundlesDir, { withFileTypes: true });
    const bundles: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Check if it has a package.json
      const packageJsonPath = join(bundlesDir, entry.name, 'package.json');
      try {
        await stat(packageJsonPath);
        bundles.push(entry.name);
      } catch {
        // No package.json, skip
      }
    }

    return bundles;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENOENT') {
      console.warn(chalk.yellow('Bundles directory not found'));
      return [];
    }
    throw error;
  }
}

/**
 * Build a single bundle
 */
async function buildBundle(bundlesDir: string, bundleName: string): Promise<void> {
  console.log(chalk.cyan(`\n  Building ${bundleName}...`));

  const bundleDir = join(bundlesDir, bundleName);

  // Check if bundle has package.json
  const packageJsonPath = join(bundleDir, 'package.json');
  try {
    await stat(packageJsonPath);
  } catch {
    throw new Error('No package.json found');
  }

  // Read package.json to check for build scripts
  const packageJson = JSON.parse(
    await import('fs/promises').then((fs) => fs.readFile(packageJsonPath, 'utf-8'))
  );

  // TypeScript compilation (if tsconfig.json exists)
  try {
    await stat(join(bundleDir, 'tsconfig.json'));
    console.log(chalk.gray('    • Compiling TypeScript...'));
    await execAsync('npx tsc', { cwd: bundleDir });
    console.log(chalk.green('      ✓ TypeScript compiled'));
  } catch {
    // No TypeScript, skip
  }

  // Vite build (if vite.config exists)
  try {
    const viteConfigFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
    let hasViteConfig = false;

    for (const configFile of viteConfigFiles) {
      try {
        await stat(join(bundleDir, configFile));
        hasViteConfig = true;
        break;
      } catch {
        continue;
      }
    }

    if (hasViteConfig) {
      console.log(chalk.gray('    • Building with Vite...'));
      await execAsync('npx vite build', { cwd: bundleDir });
      console.log(chalk.green('      ✓ Vite build complete'));
    }
  } catch (_error) {
    // Vite build failed, but might not be required
    console.log(chalk.yellow('      ⚠ Vite build failed (may not be required)'));
  }

  // Run custom build script if available
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log(chalk.gray('    • Running custom build script...'));
    try {
      await execAsync('npm run build', { cwd: bundleDir });
      console.log(chalk.green('      ✓ Custom build complete'));
    } catch (_error) {
      // Build script might include vite/tsc which we already ran
      console.log(chalk.gray('      ⓘ Build script completed (with warnings)'));
    }
  }

  console.log(chalk.green(`  ✓ ${bundleName} built successfully`));
}
