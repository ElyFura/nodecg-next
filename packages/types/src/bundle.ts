/**
 * Bundle type definitions for NodeCG Next
 */

export interface BundleDependency {
  [bundleName: string]: string;
}

export interface BundleAssetCategory {
  name: string;
  title: string;
  allowedTypes?: string[];
  maxSize?: number;
}

export interface BundleConfig {
  /** Bundle name (unique identifier) */
  name: string;
  /** Bundle version */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Homepage URL */
  homepage?: string;
  /** Author information */
  author?: string | { name: string; email?: string; url?: string };
  /** License */
  license?: string;
  /** Bundle dependencies */
  dependencies?: BundleDependency;
  /** NodeCG-specific configuration */
  nodecg: {
    /** Compatible NodeCG versions */
    compatibleRange: string;
    /** Dashboard panels */
    dashboardPanels?: BundlePanelConfig[];
    /** Graphics */
    graphics?: BundleGraphicConfig[];
    /** Asset categories */
    assetCategories?: BundleAssetCategory[];
  };
}

export interface BundlePanelConfig {
  /** Panel name */
  name: string;
  /** Panel title */
  title: string;
  /** Panel width (1-12 columns) */
  width: number;
  /** Panel height in pixels */
  height?: number;
  /** Panel file path */
  file: string;
  /** Workspace (optional grouping) */
  workspace?: string;
  /** Whether panel should take full viewport (fullbleed) */
  fullbleed?: boolean;
}

export interface BundleGraphicConfig {
  /** Graphic name */
  name: string;
  /** Graphic URL path */
  url: string;
  /** Graphic file path */
  file: string;
  /** Graphic width */
  width: number;
  /** Graphic height */
  height: number;
  /** Whether graphic is single instance */
  singleInstance?: boolean;
}

export interface Bundle {
  /** Bundle configuration */
  config: BundleConfig;
  /** Bundle directory path */
  dir: string;
  /** Bundle status */
  enabled: boolean;
  /** Extension instance (if loaded) */
  extension?: unknown;
}

export interface BundleManager {
  /** Load a bundle */
  load(bundleName: string): Promise<Bundle>;
  /** Unload a bundle */
  unload(bundleName: string): Promise<void>;
  /** Reload a bundle */
  reload(bundleName: string): Promise<Bundle>;
  /** Get a bundle */
  get(bundleName: string): Bundle | undefined;
  /** Get all bundles */
  getAll(): Bundle[];
  /** Enable a bundle */
  enable(bundleName: string): Promise<void>;
  /** Disable a bundle */
  disable(bundleName: string): Promise<void>;
}
