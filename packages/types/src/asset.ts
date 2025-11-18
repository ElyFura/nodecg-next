/**
 * Asset management type definitions for NodeCG Next
 */

export interface Asset {
  /** Asset ID */
  id: string;
  /** Bundle namespace */
  namespace: string;
  /** Asset category */
  category: string;
  /** Asset name */
  name: string;
  /** MD5 checksum */
  sum: string;
  /** Asset URL */
  url: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

export interface AssetUploadOptions {
  /** Bundle namespace */
  namespace: string;
  /** Asset category */
  category: string;
  /** File buffer */
  buffer: Buffer;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Processing options */
  processing?: {
    /** Resize image (if image) */
    resize?: {
      width: number;
      height: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };
    /** Compress */
    compress?: boolean;
    /** Quality (0-100) */
    quality?: number;
  };
}

export interface AssetService {
  /** Upload an asset */
  upload(options: AssetUploadOptions): Promise<Asset>;
  /** Get an asset */
  get(namespace: string, category: string, name: string): Promise<Asset | null>;
  /** Delete an asset */
  delete(id: string): Promise<void>;
  /** List assets */
  list(namespace: string, category?: string): Promise<Asset[]>;
  /** Get asset URL */
  getURL(id: string): Promise<string>;
}
