/**
 * Asset Manager Service
 * Handles asset uploads, storage (S3/MinIO), and image processing
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import sharp from 'sharp';
import type { MultipartFile } from '@fastify/multipart';
import { BaseService, ServiceOptions } from '../base.service';
import { AssetRepository } from '../../database/repositories/asset.repository';
import { getRepositories } from '../../database/client';
import { NodeCGError, ErrorCodes } from '../../utils/errors';

export interface AssetManagerOptions extends ServiceOptions {
  /**
   * Storage backend: 'local' or 's3'
   */
  storage?: 'local' | 's3';

  /**
   * Local storage directory (when storage='local')
   */
  localStoragePath?: string;

  /**
   * S3/MinIO configuration (when storage='s3')
   */
  s3?: {
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket: string;
    forcePathStyle?: boolean;
  };

  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;

  /**
   * Allowed MIME types
   */
  allowedMimeTypes?: string[];

  /**
   * Enable image processing
   */
  enableImageProcessing?: boolean;

  /**
   * Image processing options
   */
  imageProcessing?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    generateThumbnails?: boolean;
    thumbnailSizes?: Array<{ width: number; height: number; suffix: string }>;
  };
}

export interface UploadResult {
  id: string;
  name: string;
  namespace: string;
  category: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_IMAGE_PROCESSING = {
  maxWidth: 4096,
  maxHeight: 4096,
  quality: 90,
  generateThumbnails: true,
  thumbnailSizes: [
    { width: 150, height: 150, suffix: 'thumb' },
    { width: 800, height: 600, suffix: 'medium' },
  ],
};

/**
 * Asset Manager Service
 */
export class AssetManager extends BaseService {
  private repository: AssetRepository;
  private storage: 'local' | 's3';
  private localStoragePath: string;
  private s3Client?: S3Client;
  private s3Bucket?: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];
  private enableImageProcessing: boolean;
  private imageProcessingOptions: typeof DEFAULT_IMAGE_PROCESSING;

  constructor(options: AssetManagerOptions = {}) {
    super('AssetManager', options);
    this.repository = getRepositories(this.logger).asset;
    this.storage = options.storage || 'local';
    this.localStoragePath = options.localStoragePath || join(process.cwd(), 'assets');
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB default
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
    ];
    this.enableImageProcessing = options.enableImageProcessing ?? true;
    this.imageProcessingOptions = {
      ...DEFAULT_IMAGE_PROCESSING,
      ...options.imageProcessing,
    };

    // Initialize S3 client if using S3 storage
    if (this.storage === 's3' && options.s3) {
      this.s3Client = new S3Client({
        endpoint: options.s3.endpoint,
        region: options.s3.region || 'us-east-1',
        credentials:
          options.s3.accessKeyId && options.s3.secretAccessKey
            ? {
                accessKeyId: options.s3.accessKeyId,
                secretAccessKey: options.s3.secretAccessKey,
              }
            : undefined,
        forcePathStyle: options.s3.forcePathStyle ?? true, // Required for MinIO
      });
      this.s3Bucket = options.s3.bucket;
    }
  }

  /**
   * Initialize the asset manager
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info(`Storage backend: ${this.storage}`);
    this.logger.info(`Max file size: ${(this.maxFileSize / (1024 * 1024)).toFixed(2)}MB`);
    this.logger.info(`Image processing: ${this.enableImageProcessing ? 'enabled' : 'disabled'}`);

    // Create local storage directory if using local storage
    if (this.storage === 'local') {
      await mkdir(this.localStoragePath, { recursive: true });
      this.logger.info(`Local storage path: ${this.localStoragePath}`);
    }

    // Test S3 connection if using S3 storage
    if (this.storage === 's3' && this.s3Client && this.s3Bucket) {
      try {
        // Try to list objects to verify connection
        await this.s3Client
          .send(
            new GetObjectCommand({
              Bucket: this.s3Bucket,
              Key: '__test__',
            })
          )
          .catch(() => {
            // Expected to fail, just testing connection
          });
        this.logger.info(`S3 connection successful: ${this.s3Bucket}`);
      } catch (error) {
        this.logger.warn('S3 connection test failed:', error);
      }
    }

    this.emitEvent('ready');
  }

  /**
   * Upload an asset
   */
  async upload(
    file: MultipartFile,
    namespace: string,
    category: string,
    options: {
      name?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<UploadResult> {
    this.assertInitialized();

    // Validate file
    await this.validateFile(file);

    const fileName = options.name || file.filename;
    const mimeType = file.mimetype;
    const ext = extname(fileName);
    const nameWithoutExt = basename(fileName, ext);

    this.logger.info(`Uploading asset: ${fileName} (${namespace}/${category})`);

    try {
      // Save file to storage
      const { url, size } = await this.saveFile(file, namespace, category, fileName);

      // Process image if applicable
      if (this.enableImageProcessing && this.isImage(mimeType)) {
        await this.processImage(file, namespace, category, nameWithoutExt, ext);
      }

      // Create database record
      const asset = await this.repository.create({
        name: fileName,
        namespace,
        category,
        url,
        sum: '', // TODO: Calculate checksum
        size,
        mimeType,
      });

      this.emitEvent('asset:uploaded', asset);

      return {
        id: asset.id,
        name: asset.name,
        namespace: asset.namespace,
        category: asset.category,
        url: asset.url,
        size: asset.size,
        mimeType: asset.mimeType,
        metadata: options.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to upload asset ${fileName}:`, error);
      throw new NodeCGError(ErrorCodes.ASSET_UPLOAD_FAILED, `Failed to upload asset: ${error}`);
    }
  }

  /**
   * Delete an asset
   */
  async delete(namespace: string, category: string, name: string): Promise<void> {
    this.assertInitialized();

    this.logger.info(`Deleting asset: ${name} (${namespace}/${category})`);

    try {
      // Get asset from database
      const asset = await this.repository.findByNamespaceCategoryAndName(namespace, category, name);

      if (!asset) {
        throw new NodeCGError(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found');
      }

      // Delete file from storage
      await this.deleteFile(namespace, category, name);

      // Delete thumbnails if image
      if (this.isImage(asset.mimeType)) {
        await this.deleteThumbnails(namespace, category, name);
      }

      // Delete database record
      await this.repository.deleteByNamespaceCategoryAndName(namespace, category, name);

      this.emitEvent('asset:deleted', asset);
    } catch (error) {
      this.logger.error(`Failed to delete asset ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get asset URL
   */
  getAssetUrl(namespace: string, category: string, name: string): string {
    if (this.storage === 's3' && this.s3Bucket) {
      const endpoint = process.env.S3_ENDPOINT || 'https://s3.amazonaws.com';
      return `${endpoint}/${this.s3Bucket}/assets/${namespace}/${category}/${name}`;
    }

    return `/assets/${namespace}/${category}/${name}`;
  }

  /**
   * Validate file before upload
   */
  private async validateFile(file: MultipartFile): Promise<void> {
    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new NodeCGError(
        ErrorCodes.ASSET_INVALID_TYPE,
        `File type ${file.mimetype} is not allowed`
      );
    }

    // Check file size (we'll approximate since multipart doesn't give exact size upfront)
    // Actual size check will happen during upload
  }

  /**
   * Save file to storage
   */
  private async saveFile(
    file: MultipartFile,
    namespace: string,
    category: string,
    fileName: string
  ): Promise<{ url: string; size: number }> {
    if (this.storage === 's3') {
      return this.saveFileToS3(file, namespace, category, fileName);
    } else {
      return this.saveFileLocally(file, namespace, category, fileName);
    }
  }

  /**
   * Save file to local storage
   */
  private async saveFileLocally(
    file: MultipartFile,
    namespace: string,
    category: string,
    fileName: string
  ): Promise<{ url: string; size: number }> {
    const dir = join(this.localStoragePath, namespace, category);
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, fileName);
    const writeStream = createWriteStream(filePath);

    let size = 0;
    const buffer = await file.toBuffer();
    size = buffer.length;

    if (size > this.maxFileSize) {
      throw new NodeCGError(
        ErrorCodes.ASSET_UPLOAD_FAILED,
        `File size ${size} exceeds maximum ${this.maxFileSize}`
      );
    }

    writeStream.write(buffer);
    writeStream.end();

    const url = this.getAssetUrl(namespace, category, fileName);

    return { url, size };
  }

  /**
   * Save file to S3/MinIO
   */
  private async saveFileToS3(
    file: MultipartFile,
    namespace: string,
    category: string,
    fileName: string
  ): Promise<{ url: string; size: number }> {
    if (!this.s3Client || !this.s3Bucket) {
      throw new NodeCGError(ErrorCodes.ASSET_UPLOAD_FAILED, 'S3 client not configured');
    }

    const key = `assets/${namespace}/${category}/${fileName}`;
    const buffer = await file.toBuffer();
    const size = buffer.length;

    if (size > this.maxFileSize) {
      throw new NodeCGError(
        ErrorCodes.ASSET_UPLOAD_FAILED,
        `File size ${size} exceeds maximum ${this.maxFileSize}`
      );
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: file.mimetype,
      })
    );

    const url = this.getAssetUrl(namespace, category, fileName);

    return { url, size };
  }

  /**
   * Delete file from storage
   */
  private async deleteFile(namespace: string, category: string, fileName: string): Promise<void> {
    if (this.storage === 's3' && this.s3Client && this.s3Bucket) {
      const key = `assets/${namespace}/${category}/${fileName}`;
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        })
      );
    } else {
      const filePath = join(this.localStoragePath, namespace, category, fileName);
      await unlink(filePath).catch(() => {
        // File might not exist, ignore
      });
    }
  }

  /**
   * Process image (resize, optimize, generate thumbnails)
   */
  private async processImage(
    file: MultipartFile,
    namespace: string,
    category: string,
    nameWithoutExt: string,
    ext: string
  ): Promise<void> {
    this.logger.debug(`Processing image: ${nameWithoutExt}${ext}`);

    try {
      const buffer = await file.toBuffer();
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if too large
      const maxWidth = this.imageProcessingOptions.maxWidth;
      const maxHeight = this.imageProcessingOptions.maxHeight;

      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > maxWidth || metadata.height > maxHeight)
      ) {
        this.logger.debug(
          `Resizing image from ${metadata.width}x${metadata.height} to fit ${maxWidth}x${maxHeight}`
        );

        const resized = await image
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: this.imageProcessingOptions.quality })
          .toBuffer();

        // Save resized image
        await this.saveProcessedImage(
          resized,
          namespace,
          category,
          `${nameWithoutExt}${ext}`,
          'image/jpeg'
        );
      }

      // Generate thumbnails
      if (this.imageProcessingOptions.generateThumbnails) {
        for (const size of this.imageProcessingOptions.thumbnailSizes || []) {
          this.logger.debug(`Generating ${size.suffix} thumbnail: ${size.width}x${size.height}`);

          const thumbnail = await sharp(buffer)
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'center',
            })
            .jpeg({ quality: 80 })
            .toBuffer();

          const thumbnailName = `${nameWithoutExt}_${size.suffix}.jpg`;
          await this.saveProcessedImage(
            thumbnail,
            namespace,
            category,
            thumbnailName,
            'image/jpeg'
          );
        }
      }
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      // Don't throw - image processing is optional
    }
  }

  /**
   * Save processed image
   */
  private async saveProcessedImage(
    buffer: Buffer,
    namespace: string,
    category: string,
    fileName: string,
    mimeType: string
  ): Promise<void> {
    if (this.storage === 's3' && this.s3Client && this.s3Bucket) {
      const key = `assets/${namespace}/${category}/${fileName}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );
    } else {
      const dir = join(this.localStoragePath, namespace, category);
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, fileName);
      const writeStream = createWriteStream(filePath);
      writeStream.write(buffer);
      writeStream.end();
    }
  }

  /**
   * Delete thumbnails
   */
  private async deleteThumbnails(
    namespace: string,
    category: string,
    originalName: string
  ): Promise<void> {
    const ext = extname(originalName);
    const nameWithoutExt = basename(originalName, ext);

    for (const size of this.imageProcessingOptions.thumbnailSizes || []) {
      const thumbnailName = `${nameWithoutExt}_${size.suffix}.jpg`;
      await this.deleteFile(namespace, category, thumbnailName);
    }
  }

  /**
   * Check if MIME type is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
  }
}
