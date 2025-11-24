/**
 * CLI Create Command
 * Creates a new NodeCG bundle from templates
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';

export interface CreateOptions {
  template?: string;
  name?: string;
  description?: string;
  author?: string;
  git?: boolean;
}

const TEMPLATES = [
  {
    name: 'React + TypeScript',
    value: 'react-ts',
    description: 'Modern React 18 bundle with TypeScript and Vite',
  },
  {
    name: 'Vue + TypeScript',
    value: 'vue-ts',
    description: 'Vue 3 Composition API bundle with TypeScript and Vite',
  },
  {
    name: 'Minimal JavaScript',
    value: 'minimal-js',
    description: 'Lightweight JavaScript bundle with no framework',
  },
  {
    name: 'Minimal TypeScript',
    value: 'minimal-ts',
    description: 'Lightweight TypeScript bundle with no framework',
  },
];

/**
 * Find the NodeCG project root by looking for package.json with workspaces
 * or fallback to current directory
 */
async function findProjectRoot(): Promise<string> {
  let currentDir = process.cwd();
  const { readFile } = await import('fs/promises');

  // Try to find project root by looking for package.json with workspaces
  while (currentDir !== '/') {
    try {
      const packageJsonPath = join(currentDir, 'package.json');
      await access(packageJsonPath);
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      // Check if this is the NodeCG workspace root
      if (pkg.workspaces || pkg.name === 'nodecg-next' || pkg.name === '@nodecg/monorepo') {
        return currentDir;
      }
    } catch {
      // Continue searching up
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Create command handler
 */
export async function createCommand(
  bundleName?: string,
  options: CreateOptions = {}
): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 NodeCG Bundle Generator\n'));

  // Get bundle name
  const name =
    bundleName ||
    options.name ||
    (await input({
      message: 'Bundle name:',
      default: 'my-nodecg-bundle',
      validate: (value) => {
        if (!value || value.length === 0) {
          return 'Bundle name is required';
        }
        if (!/^[a-z0-9-_]+$/.test(value)) {
          return 'Bundle name must contain only lowercase letters, numbers, dashes, and underscores';
        }
        return true;
      },
    }));

  // Get template
  const template =
    options.template ||
    (await select({
      message: 'Select a template:',
      choices: TEMPLATES,
    }));

  // Get description
  const description =
    options.description ||
    (await input({
      message: 'Bundle description:',
      default: 'A NodeCG bundle',
    }));

  // Get author
  const author =
    options.author ||
    (await input({
      message: 'Author name:',
      default: '',
    }));

  // Initialize git repository
  const initGit =
    options.git ??
    (await confirm({
      message: 'Initialize git repository?',
      default: true,
    }));

  console.log(chalk.cyan('\n📦 Creating bundle...'));

  // Find project root and create bundle in /bundles directory
  const projectRoot = await findProjectRoot();
  const bundlesDir = join(projectRoot, 'bundles');
  const bundleDir = join(bundlesDir, name);

  // Ensure bundles directory exists
  await mkdir(bundlesDir, { recursive: true });

  try {
    // Create bundle directory structure
    await mkdir(bundleDir, { recursive: true });
    await mkdir(join(bundleDir, 'src'), { recursive: true });
    await mkdir(join(bundleDir, 'extension'), { recursive: true });
    await mkdir(join(bundleDir, 'graphics'), { recursive: true });
    await mkdir(join(bundleDir, 'dashboard'), { recursive: true });

    // Generate files based on template
    await generateTemplate(bundleDir, template as string, {
      name,
      description,
      author,
    });

    // Initialize git if requested
    if (initGit) {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('git init', { cwd: bundleDir });
      await writeFile(
        join(bundleDir, '.gitignore'),
        `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
`
      );

      console.log(chalk.green('  ✓ Initialized git repository'));
    }

    console.log(chalk.green.bold(`\n✨ Bundle created successfully!`));
    console.log(chalk.white(`\nBundle created at: ${chalk.cyan(bundleDir)}`));
    console.log(chalk.white(`\nNext steps:`));
    console.log(chalk.cyan(`  cd bundles/${name}`));
    console.log(chalk.cyan(`  npm install`));
    console.log(chalk.cyan(`  npm run dev`));
    console.log();
  } catch (error) {
    console.error(chalk.red('Failed to create bundle:'), error);
    process.exit(1);
  }
}

/**
 * Generate template files
 */
async function generateTemplate(
  bundleDir: string,
  template: string,
  metadata: { name: string; description: string; author: string }
): Promise<void> {
  const { name, description, author } = metadata;

  // Generate package.json
  const packageJson: {
    name: string;
    version: string;
    description: string;
    author?: string;
    license: string;
    nodecg: Record<string, unknown>;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } = {
    name,
    version: '0.1.0',
    description,
    ...(author && { author }),
    license: 'MIT',
    nodecg: {
      compatibleRange: '^3.0.0',
      dashboardPanels: [
        {
          name: 'main',
          title: 'Main Panel',
          width: 2,
          file: 'main.html',
        },
      ],
      graphics: [
        {
          file: 'main.html',
          width: 1920,
          height: 1080,
        },
      ],
      assetCategories: [
        {
          name: 'images',
          title: 'Images',
          allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        },
      ],
    },
    scripts: {
      dev: 'nodecg dev',
      build: 'nodecg build',
      ...(template.includes('ts') && {
        typecheck: 'tsc --noEmit',
      }),
    },
    dependencies: {
      '@nodecg/types': '^3.0.0',
    },
    devDependencies: {},
  };

  // Add template-specific dependencies
  switch (template) {
    case 'react-ts':
      packageJson.dependencies = {
        ...packageJson.dependencies,
        react: '^18.0.0',
        'react-dom': '^18.0.0',
        '@nodecg/react-hooks': '^3.0.0',
      };
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        typescript: '^5.0.0',
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.0.0',
      };
      break;

    case 'vue-ts':
      packageJson.dependencies = {
        ...packageJson.dependencies,
        vue: '^3.0.0',
        '@nodecg/vue-composables': '^3.0.0',
      };
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        typescript: '^5.0.0',
        vite: '^5.0.0',
        '@vitejs/plugin-vue': '^4.0.0',
      };
      break;

    case 'minimal-ts':
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        typescript: '^5.0.0',
      };
      break;
  }

  await writeFile(join(bundleDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  console.log(chalk.green('  ✓ Generated package.json'));

  // Generate README.md
  const readme = `# ${name}

${description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## License

MIT
`;

  await writeFile(join(bundleDir, 'README.md'), readme);
  console.log(chalk.green('  ✓ Generated README.md'));

  // Generate template-specific files
  switch (template) {
    case 'react-ts':
      await generateReactTemplate(bundleDir, name);
      break;
    case 'vue-ts':
      await generateVueTemplate(bundleDir, name);
      break;
    case 'minimal-ts':
      await generateMinimalTsTemplate(bundleDir, name);
      break;
    case 'minimal-js':
      await generateMinimalJsTemplate(bundleDir, name);
      break;
  }
}

/**
 * Generate React + TypeScript template
 */
async function generateReactTemplate(bundleDir: string, name: string): Promise<void> {
  // Extension
  const extensionTs = `import type { NodeCG } from '@nodecg/types';

export default function (nodecg: NodeCG) {
  nodecg.log.info('${name} extension loaded');

  // Create a replicant
  const myReplicant = nodecg.Replicant('myReplicant', {
    defaultValue: 'Hello from ${name}!',
  });

  // Listen for changes
  myReplicant.on('change', (newValue) => {
    nodecg.log.info('Replicant changed:', newValue);
  });
}
`;

  await writeFile(join(bundleDir, 'extension', 'index.ts'), extensionTs);

  // Graphics
  const graphicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Graphic</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/graphics/main.tsx"></script>
</body>
</html>
`;

  await writeFile(join(bundleDir, 'graphics', 'main.html'), graphicHtml);

  const graphicTsx = `import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useReplicant } from '@nodecg/react-hooks';

function Graphic() {
  const [myReplicant] = useReplicant('myReplicant', 'Hello World!');

  return (
    <div style={{ fontSize: '48px', color: 'white', padding: '20px' }}>
      {myReplicant}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Graphic />);
`;

  await mkdir(join(bundleDir, 'src', 'graphics'), { recursive: true });
  await writeFile(join(bundleDir, 'src', 'graphics', 'main.tsx'), graphicTsx);

  // Dashboard
  const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Dashboard</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/dashboard/main.tsx"></script>
</body>
</html>
`;

  await writeFile(join(bundleDir, 'dashboard', 'main.html'), dashboardHtml);

  const dashboardTsx = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { useReplicant } from '@nodecg/react-hooks';

function Dashboard() {
  const [myReplicant, setMyReplicant] = useReplicant('myReplicant', 'Hello World!');

  return (
    <div style={{ padding: '20px' }}>
      <h2>${name} Dashboard</h2>
      <input
        type="text"
        value={myReplicant}
        onChange={(e) => setMyReplicant(e.target.value)}
        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
      />
      <p>Value: {myReplicant}</p>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Dashboard />);
`;

  await mkdir(join(bundleDir, 'src', 'dashboard'), { recursive: true });
  await writeFile(join(bundleDir, 'src', 'dashboard', 'main.tsx'), dashboardTsx);

  // TypeScript config
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      allowImportingTsExtensions: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*', 'extension/**/*'],
  };

  await writeFile(join(bundleDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  // Vite config
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        graphics: './graphics/main.html',
        dashboard: './dashboard/main.html',
      },
    },
  },
});
`;

  await writeFile(join(bundleDir, 'vite.config.ts'), viteConfig);

  console.log(chalk.green('  ✓ Generated React + TypeScript template files'));
}

/**
 * Generate Vue + TypeScript template
 */
async function generateVueTemplate(bundleDir: string, name: string): Promise<void> {
  // Extension (same as React)
  const extensionTs = `import type { NodeCG } from '@nodecg/types';

export default function (nodecg: NodeCG) {
  nodecg.log.info('${name} extension loaded');

  const myReplicant = nodecg.Replicant('myReplicant', {
    defaultValue: 'Hello from ${name}!',
  });

  myReplicant.on('change', (newValue) => {
    nodecg.log.info('Replicant changed:', newValue);
  });
}
`;

  await writeFile(join(bundleDir, 'extension', 'index.ts'), extensionTs);

  // Graphics
  const graphicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Graphic</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/graphics/main.ts"></script>
</body>
</html>
`;

  await writeFile(join(bundleDir, 'graphics', 'main.html'), graphicHtml);

  const graphicVue = `<template>
  <div style="font-size: 48px; color: white; padding: 20px">
    {{ myReplicant }}
  </div>
</template>

<script setup lang="ts">
import { useReplicant } from '@nodecg/vue-composables';

const myReplicant = useReplicant<string>('myReplicant', 'Hello World!');
</script>
`;

  await mkdir(join(bundleDir, 'src', 'graphics'), { recursive: true });
  await writeFile(join(bundleDir, 'src', 'graphics', 'Graphic.vue'), graphicVue);

  const graphicMain = `import { createApp } from 'vue';
import Graphic from './Graphic.vue';

createApp(Graphic).mount('#app');
`;

  await writeFile(join(bundleDir, 'src', 'graphics', 'main.ts'), graphicMain);

  // TypeScript + Vite config similar to React
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['src/**/*', 'extension/**/*'],
  };

  await writeFile(join(bundleDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  console.log(chalk.green('  ✓ Generated Vue + TypeScript template files'));
}

/**
 * Generate Minimal TypeScript template
 */
async function generateMinimalTsTemplate(bundleDir: string, name: string): Promise<void> {
  const extensionTs = `import type { NodeCG } from '@nodecg/types';

export default function (nodecg: NodeCG) {
  nodecg.log.info('${name} extension loaded');
}
`;

  await writeFile(join(bundleDir, 'extension', 'index.ts'), extensionTs);

  const graphicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
</head>
<body>
  <h1>Hello from ${name}</h1>
  <script type="module" src="/src/graphics/main.ts"></script>
</body>
</html>
`;

  await writeFile(join(bundleDir, 'graphics', 'main.html'), graphicHtml);

  const graphicTs = `console.log('${name} graphic loaded');
`;

  await mkdir(join(bundleDir, 'src', 'graphics'), { recursive: true });
  await writeFile(join(bundleDir, 'src', 'graphics', 'main.ts'), graphicTs);

  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      lib: ['ES2020', 'DOM'],
      moduleResolution: 'bundler',
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['src/**/*', 'extension/**/*'],
  };

  await writeFile(join(bundleDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

  console.log(chalk.green('  ✓ Generated Minimal TypeScript template files'));
}

/**
 * Generate Minimal JavaScript template
 */
async function generateMinimalJsTemplate(bundleDir: string, name: string): Promise<void> {
  const extensionJs = `module.exports = function (nodecg) {
  nodecg.log.info('${name} extension loaded');
};
`;

  await writeFile(join(bundleDir, 'extension', 'index.js'), extensionJs);

  const graphicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
</head>
<body>
  <h1>Hello from ${name}</h1>
  <script src="/src/graphics/main.js"></script>
</body>
</html>
`;

  await writeFile(join(bundleDir, 'graphics', 'main.html'), graphicHtml);

  const graphicJs = `console.log('${name} graphic loaded');
`;

  await mkdir(join(bundleDir, 'src', 'graphics'), { recursive: true });
  await writeFile(join(bundleDir, 'src', 'graphics', 'main.js'), graphicJs);

  console.log(chalk.green('  ✓ Generated Minimal JavaScript template files'));
}
