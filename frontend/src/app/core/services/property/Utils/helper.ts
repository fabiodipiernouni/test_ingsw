import {PropertyModel} from '@features/properties/models/PropertyModel';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {GeoPropertyCardDto} from '@core/services/property/dto/GeoPropertyCardDto';
import {Address} from '@service-shared/models/Address';
import {property} from 'lodash-es';

declare const google: any;

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
      location: property.location,
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

  /**
   * Fallback: geocodifica l'indirizzo usando city + province e aggiunge il marker
   */
  static async geocodeByAddress(address: Address): Promise<{ lat: number; lng: number } | undefined> {

    const addressFormatted = `${address.street}, ${address.zipCode}, ${address.city}, ${address.province}, ${address.country}`;
    const geocoder = new google.maps.Geocoder();

    try {
      const result = await geocoder.geocode({ addressFormatted });
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        console.log(`  ✅ Geocoding riuscito per "${addressFormatted}"`);
        return { lat: location.lat(), lng: location.lng() };
      } else {
        console.warn(`  ❌ Geocoding fallito per "${address}": nessun risultato`);
      }
    } catch (error) {
      console.warn(`  ❌ Geocoding fallito per "${address}":`, error);
    }

    return undefined;
  }

}

