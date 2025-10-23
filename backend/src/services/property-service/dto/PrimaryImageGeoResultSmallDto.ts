export class PrimaryImageGeoResultSmallDto {
  id?: string;
  // File metadata
  fileName?: string;
  contentType?: string;
  // Display properties
  caption?: string;
  alt?: string;
  // Pre-signed URLs (generated on-the-fly)
  smallUrl: string;
}