import {PropertyModel} from '@features/properties/models/PropertyModel';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {Address} from '@service-shared/models/Address';

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
   * Geocodifica l'indirizzo provando diverse varianti per maggiore flessibilità
   */
  static async geocodeByAddress(address: Address): Promise<{ lat: number; lng: number } | undefined> {
    const geocoder = new google.maps.Geocoder();

    // Prova diverse varianti dell'indirizzo per aumentare le probabilità di successo
    const addressVariants = [
      // Variante 1: Indirizzo completo
      `${address.street}, ${address.zipCode}, ${address.city}, ${address.province}, ${address.country}`,
      // Variante 2: Senza CAP
      `${address.street}, ${address.city}, ${address.province}, ${address.country}`,
      // Variante 3: Solo città e provincia
      `${address.city}, ${address.province}, ${address.country}`,
      // Variante 4: Solo città
      `${address.city}, ${address.country}`
    ];

    for (const addressString of addressVariants) {
      try {
        const result = await geocoder.geocode({ address: addressString }); // ✅ Parametro corretto: 'address'

        if (result.results && result.results.length > 0) {
          const location = result.results[0].geometry.location;
          console.log(`  ✅ Geocoding riuscito per "${addressString}"`);
          return { lat: location.lat(), lng: location.lng() };
        }
      } catch (error) {
        console.warn(`  ⚠️ Geocoding fallito per "${addressString}":`, error);
        // Continua con la prossima variante
      }
    }

    console.warn(`  ❌ Geocoding fallito per tutte le varianti dell'indirizzo`);
    return undefined;
  }

}

