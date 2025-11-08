export interface PropertyImageModel {
  id?: string;
  // File metadata
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  uploadDate?: Date | string;
  // Display properties
  caption?: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
  // Pre-signed URLs (generated on-the-fly)
  urls?: {
    original?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}