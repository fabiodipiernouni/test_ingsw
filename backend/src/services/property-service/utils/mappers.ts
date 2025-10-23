import { PropertyCardDto } from '@property/dto/PropertyCardDto';
import { imageService } from '@shared/services/ImageService';
import { GeoPropertyCardDto } from '@property/dto/GeoPropertyCardDto';
import { PrimaryImageGeoResultSmallDto } from '@property/dto/PrimaryImageGeoResultSmallDto';
import { PropertyModel } from '@property/models/PropertyModel';
import { Helper } from '@property/utils/helper';
import { Property } from '@shared/database/models';

export class Mappers {
  /**
   * Costruisce un PropertyCardDto dalla Property entity
   * @param property La proprietà da formattare
   * @returns Il PropertyCardDto formattato
   */
  static async formatPropertyCardResponse(property: Property): Promise<PropertyCardDto> {
    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (property.images || []).map(async (image) => {
        // If image has S3 keys, generate signed URLs using getImageVariants()
        if (image.s3KeyOriginal) {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          return {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            fileSize: image.fileSize,
            width: image.width,
            height: image.height,
            caption: image.caption,
            alt: image.alt,
            isPrimary: image.isPrimary,
            order: image.order,
            uploadDate: image.uploadDate,
            urls
          };
        }
        return undefined; // Should not happen since all images should have S3 keys
      })
    );

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      city: property.city,
      province: property.province,
      primaryImage: imagesWithUrls.find(img => img?.isPrimary),
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      agentId: property.agentId,
      views: property.views,
      location: property.location,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

  /**
   * Costruisce un GeoPropertyCardDto dalla Property entity
   * @param property La proprietà da formattare
   * @returns Il GeoPropertyCardDto formattato
   */
  static async formatGeoPropertyCardResponse(property: Property): Promise<GeoPropertyCardDto> {
    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (property.images || []).filter(i => i.isPrimary).map(async (image) => {
        // If image has S3 keys, generate signed URLs using getImageVariants()
        if (image.s3KeyOriginal) {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          const imgRes: PrimaryImageGeoResultSmallDto = {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            caption: image.caption,
            alt: image.alt,
            smallUrl: urls.small
          };

          return imgRes;
        }
        return undefined; // Should not happen since all images should have S3 keys
      })
    );

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      rooms: property.rooms,
      area: property.area,
      city: property.city,
      province: property.province,
      primaryImage: imagesWithUrls[0],
      location: property.location
    };
  }

  /**
   * Costruisce un PropertyModel dalla Property entity
   * @param property La proprietà da formattare
   * @returns Il PropertyModel formattato
   */
  static async formatPropertyToModel(property: Property): Promise<PropertyModel> {
    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (property.images || []).map(async (image) => {
        // If image has S3 keys, generate signed URLs using getImageVariants()
        if (image.s3KeyOriginal) {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          return {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            fileSize: image.fileSize,
            width: image.width,
            height: image.height,
            caption: image.caption,
            alt: image.alt,
            isPrimary: image.isPrimary,
            order: image.order,
            uploadDate: image.uploadDate,
            urls
          };
        }
        return undefined; // Should not happen since all images should have S3 keys
      })
    );

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      features: property.features,
      address: {
        street: property.street,
        city: property.city,
        province: property.province,
        zipCode: property.zipCode,
        country: property.country
      },
      location: property.location,  // GeoJSON Point format
      images: imagesWithUrls as any,
      agentId: property.agentId,
      agent: Helper.userToUserModel(property.agent),
      views: property.views,
      favorites: property.favorites,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

}