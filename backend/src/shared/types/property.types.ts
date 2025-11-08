
// Types per il Property Service basati sullo schema OpenAPI
export const PROPERTY_TYPES = [
  'apartment',
  'villa',
  'house',
  'loft',
  'office',
  'commercial',
  'land'
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LISTING_TYPES = ['sale', 'rent'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const PROPERTY_STATUS = [
  'active',
  'pending',
  'sold',
  'rented',
  'withdrawn'
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUS)[number];

export const ENERGY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EnergyClass = (typeof ENERGY_CLASSES)[number];

