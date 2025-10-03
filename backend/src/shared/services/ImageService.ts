import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import config from '@shared/config';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { or } from 'sequelize';

export interface ImageVariant {
  key: string;
  size: number;
  width: number;
  height: number;
}

export interface UploadResult {
  originalKey: string;
  smallKey?: string;
  mediumKey?: string;
  largeKey?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  width?: number;
  height?: number;
  variants: ImageVariant[];
}

export class ImageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.s3.bucketName;
    
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      }
    });
  }

  /**
   * Upload an image to S3 with multiple size variants
   */
  async uploadImage(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    propertyId: string,
    agencyId: string,
    listingType: 'sale' | 'rent'
  ): Promise<UploadResult> {
    try {
      // Validate image
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
      }

      // Generate unique file key with agency hierarchy using folder structure
      const fileExtension = 'webp'; // Convert all to WebP
      const imageId = uuidv4();
      const baseKey = `agencies/${agencyId}/properties/${listingType}/${propertyId}/${imageId}`;

      const variants: ImageVariant[] = [];

      // Upload original (converted to WebP)
      const originalBuffer = await sharp(buffer)
        .webp({ quality: 95 })
        .toBuffer();

      const originalKey = `${baseKey}/original.${fileExtension}`;
      await this.uploadToS3(originalKey, originalBuffer, 'image/webp');
      
      variants.push({
        key: originalKey,
        size: originalBuffer.length,
        width: metadata.width,
        height: metadata.height
      });

      // Generate and upload small variant
      let smallKey: string | undefined;
      if (metadata.width > config.s3.imageSizes.small.width || 
          metadata.height > config.s3.imageSizes.small.height) {
        const smallBuffer = await sharp(buffer)
          .resize(
            config.s3.imageSizes.small.width,
            config.s3.imageSizes.small.height,
            { fit: 'inside', withoutEnlargement: false }
          )
          .webp({ quality: config.s3.imageSizes.small.quality })
          .toBuffer();

        smallKey = `${baseKey}/small.${fileExtension}`;
        await this.uploadToS3(smallKey, smallBuffer, 'image/webp');

        const smallMetadata = await sharp(smallBuffer).metadata();
        variants.push({
          key: smallKey,
          size: smallBuffer.length,
          width: smallMetadata.width || 0,
          height: smallMetadata.height || 0
        });
      }

      // Generate and upload medium variant
      let mediumKey: string | undefined;
      if (metadata.width > config.s3.imageSizes.medium.width || 
          metadata.height > config.s3.imageSizes.medium.height) {
        const mediumBuffer = await sharp(buffer)
          .resize(
            config.s3.imageSizes.medium.width,
            config.s3.imageSizes.medium.height,
            { fit: 'inside', withoutEnlargement: false }
          )
          .webp({ quality: config.s3.imageSizes.medium.quality })
          .toBuffer();

        mediumKey = `${baseKey}/medium.${fileExtension}`;
        await this.uploadToS3(mediumKey, mediumBuffer, 'image/webp');

        const mediumMetadata = await sharp(mediumBuffer).metadata();
        variants.push({
          key: mediumKey,
          size: mediumBuffer.length,
          width: mediumMetadata.width || 0,
          height: mediumMetadata.height || 0
        });
      }

      // Generate and upload large variant
      let largeKey: string | undefined;
      if (metadata.width > config.s3.imageSizes.large.width || 
          metadata.height > config.s3.imageSizes.large.height) {
        const largeBuffer = await sharp(buffer)
          .resize(
            config.s3.imageSizes.large.width,
            config.s3.imageSizes.large.height,
            { fit: 'inside', withoutEnlargement: false }
          )
          .webp({ quality: config.s3.imageSizes.large.quality })
          .toBuffer();

        largeKey = `${baseKey}/large.${fileExtension}`;
        await this.uploadToS3(largeKey, largeBuffer, 'image/webp');

        const largeMetadata = await sharp(largeBuffer).metadata();
        variants.push({
          key: largeKey,
          size: largeBuffer.length,
          width: largeMetadata.width || 0,
          height: largeMetadata.height || 0
        });
      }

      return {
        originalKey,
        smallKey,
        mediumKey,
        largeKey,
        fileName,
        contentType: 'image/webp',
        fileSize: originalBuffer.length,
        width: metadata.width,
        height: metadata.height,
        variants
      };
    } catch (error) {
      console.error('Error uploading image to S3:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload buffer to S3
   */
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year
        Metadata: {
          'uploaded-at': new Date().toISOString()
        }
      }
    });

    await upload.done();
  }

  /**
   * Delete an image and all its variants from S3
   */
  async deleteImage(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys
        .filter(key => key && key.length > 0)
        .map(key => 
          this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: key
            })
          )
        );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a pre-signed URL for downloading an image
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    try {

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const url = await getSignedUrl(
        this.s3Client,
        command,
        { expiresIn: expiresIn || config.s3.signedUrlExpiration }
      );

      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate signed URLs for all image variants
   */
  async getImageUrls(variants: {
    small: string;
    medium: string;
    large: string;
  }): Promise<{
    small: string;
    medium: string;
    large: string;
  }> {
    // Generate signed URLs for all variants (original not exposed to clients)
    const [smallUrl, mediumUrl, largeUrl] = await Promise.all([
      this.getSignedUrl(variants.small),
      this.getSignedUrl(variants.medium),
      this.getSignedUrl(variants.large)
    ]);

    return {
      small: smallUrl,
      medium: mediumUrl,
      large: largeUrl
    };
  }

  /**
   * Check if an object exists in S3
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key
        })
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all images for a property
   */
  async listPropertyImages(
    agencyId: string,
    listingType: 'sale' | 'rent',
    propertyId: string
  ): Promise<string[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: `agencies/${agencyId}/properties/${listingType}/${propertyId}/`
        })
      );

      return response.Contents?.map(obj => obj.Key!).filter(Boolean) || [];
    } catch (error) {
      console.error('Error listing property images:', error);
      throw new Error(`Failed to list property images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image metadata from S3
   */
  async getImageMetadata(key: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified?: Date;
  }> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key
        })
      );

      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
        lastModified: response.LastModified
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy an image to a new location
   */
  async copyImage(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      // Get the source object
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: sourceKey
      });

      const sourceObject = await this.s3Client.send(getCommand);
      
      if (!sourceObject.Body) {
        throw new Error('Source object has no body');
      }

      // Read the body
      const chunks: Uint8Array[] = [];
      for await (const chunk of sourceObject.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Upload to destination
      await this.uploadToS3(
        destinationKey,
        buffer,
        sourceObject.ContentType || 'application/octet-stream'
      );
    } catch (error) {
      console.error('Error copying image:', error);
      throw new Error(`Failed to copy image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all images for an agency
   */
  async deleteAgencyImages(agencyId: string): Promise<number> {
    try {
      const prefix = `agencies/${agencyId}/`;
      let deletedCount = 0;
      let continuationToken: string | undefined;

      do {
        const listResponse = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken
          })
        );

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deletePromises = listResponse.Contents.map(obj =>
            this.s3Client.send(
              new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: obj.Key!
              })
            )
          );

          await Promise.all(deletePromises);
          deletedCount += listResponse.Contents.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting agency images:', error);
      throw new Error(`Failed to delete agency images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage usage for an agency in bytes
   */
  async getAgencyStorageUsage(agencyId: string): Promise<{
    totalSize: number;
    fileCount: number;
    byListingType: {
      sale: { size: number; count: number };
      rent: { size: number; count: number };
    };
  }> {
    try {
      const prefix = `agencies/${agencyId}/`;
      let totalSize = 0;
      let fileCount = 0;
      const byListingType = {
        sale: { size: 0, count: 0 },
        rent: { size: 0, count: 0 }
      };
      let continuationToken: string | undefined;

      do {
        const listResponse = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken
          })
        );

        if (listResponse.Contents) {
          for (const obj of listResponse.Contents) {
            if (obj.Size) {
              totalSize += obj.Size;
              fileCount++;

              // Determine listing type from key
              if (obj.Key?.includes('/properties/sale/')) {
                byListingType.sale.size += obj.Size;
                byListingType.sale.count++;
              } else if (obj.Key?.includes('/properties/rent/')) {
                byListingType.rent.size += obj.Size;
                byListingType.rent.count++;
              }
            }
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        totalSize,
        fileCount,
        byListingType
      };
    } catch (error) {
      console.error('Error getting agency storage usage:', error);
      throw new Error(`Failed to get agency storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all properties with images for an agency
   */
  async listAgencyProperties(
    agencyId: string,
    listingType?: 'sale' | 'rent'
  ): Promise<string[]> {
    try {
      const prefix = listingType 
        ? `agencies/${agencyId}/properties/${listingType}/`
        : `agencies/${agencyId}/properties/`;
      
      const propertyIds = new Set<string>();
      let continuationToken: string | undefined;

      do {
        const listResponse = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            Delimiter: '/',
            ContinuationToken: continuationToken
          })
        );

        if (listResponse.CommonPrefixes) {
          for (const commonPrefix of listResponse.CommonPrefixes) {
            if (commonPrefix.Prefix) {
              // Extract property ID from path
              const parts = commonPrefix.Prefix.split('/');
              const propertyId = parts[parts.length - 2];
              if (propertyId) {
                propertyIds.add(propertyId);
              }
            }
          }
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return Array.from(propertyIds);
    } catch (error) {
      console.error('Error listing agency properties:', error);
      throw new Error(`Failed to list agency properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all images for a specific property
   */
  async deletePropertyImages(
    agencyId: string,
    listingType: 'sale' | 'rent',
    propertyId: string
  ): Promise<number> {
    try {
      const prefix = `agencies/${agencyId}/properties/${listingType}/${propertyId}/`;
      let deletedCount = 0;
      let continuationToken: string | undefined;

      do {
        const listResponse = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken
          })
        );

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deletePromises = listResponse.Contents.map(obj =>
            this.s3Client.send(
              new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: obj.Key!
              })
            )
          );

          await Promise.all(deletePromises);
          deletedCount += listResponse.Contents.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting property images:', error);
      throw new Error(`Failed to delete property images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageService = new ImageService();
