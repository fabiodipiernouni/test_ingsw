/**
 * DTO per i metadata delle immagini
 * Utilizzato per l'upload delle immagini
 * POST /api/properties/{id}/images
 */
export interface ImageMetadataDto {
  isPrimary: boolean;
  order: number;
  caption?: string;
  altText?: string;
}


