// Export all models
export { User } from './User';
export { Property } from './Property';
export { PropertyImage } from './PropertyImage';
export { SavedSearch } from './SavedSearch';
export { Notification } from './Notification';
export { Agency } from './Agency';

// Re-export shared GeoJSON types for convenience
export { GeoJSONPoint, GeoCoordinates, isValidGeoJSONPoint, createGeoJSONPoint } from '@shared/types/geojson.types';