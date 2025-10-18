export interface SearchPropertiesFilter {
  location?: string;           // Città o CAP

  // Ricerca geospaziale (via SDO_GEOMETRY)
  latitude?: number;
  longitude?: number;
  radiusKm?: number;

  propertyType?: string;        // APARTMENT, HOUSE, VILLA, OFFICE, COMMERCIAL, GARAGE, LAND
  listingType?: string;         // SALE, RENT
  priceMin?: number;
  priceMax?: number;
  rooms?: number;               // numero minimo di stanze
  bedrooms?: number;            // numero minimo di camere
  bathrooms?: number;           // numero minimo di bagni
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
}

