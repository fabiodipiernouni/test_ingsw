import {PropertyModel} from '@features/properties/models/PropertyModel';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';

export class Helper {
  static fromPropertyModelToPropertyCardDto(property: PropertyModel): PropertyCardDto {
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
      city: property.address.city,
      province: property.address.province,
      primaryImage: property.images && property.images.length > 0 ? property.images[0] : undefined,
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      agentId: property.agentId,
      views: property.views,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    }
  }
}

