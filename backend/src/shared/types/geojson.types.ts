/**
 * GeoJSON Types - Shared across all services
 * Standard RFC 7946 - https://tools.ietf.org/html/rfc7946
 */

import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateIf } from 'class-validator';

/**
 * GeoJSON Point
 * Rappresenta un punto geografico in formato GeoJSON standard
 * Formato: { type: 'Point', coordinates: [longitude, latitude] }
 * 
 * ⚠️ IMPORTANTE: L'ordine delle coordinate è [longitude, latitude], non [lat, lng]!
 */
export class GeoJSONPoint {
  type: string = 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateIf((o) => { return o.coordinates[0] >= -180 && o.coordinates[0] <= 180 && o.coordinates[1] >= -90 && o.coordinates[1] <= 90; }, { message: 'Coordinates must be valid longitude and latitude values' })
  coordinates: Array<number>; // [longitude, latitude]
}

/**
 * Type alias per array di coordinate GeoJSON
 * [longitude, latitude]
 */
export type GeoCoordinates = [number, number];

/**
 * Helper per validare un GeoJSON Point
 */
export function isValidGeoJSONPoint(obj: any): obj is GeoJSONPoint {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.type === 'Point' &&
    Array.isArray(obj.coordinates) &&
    obj.coordinates.length === 2 &&
    typeof obj.coordinates[0] === 'number' &&
    typeof obj.coordinates[1] === 'number' &&
    obj.coordinates[0] >= -180 &&
    obj.coordinates[0] <= 180 &&
    obj.coordinates[1] >= -90 &&
    obj.coordinates[1] <= 90
  );
}

/**
 * Helper per creare un GeoJSON Point da coordinate separate
 */
export function createGeoJSONPoint(longitude: number, latitude: number): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
}

/**
 * Helper per estrarre latitude e longitude da GeoJSON Point
 */
function extractCoordinates(point: GeoJSONPoint): { longitude: number; latitude: number } {
  return {
    longitude: point.coordinates[0],
    latitude: point.coordinates[1]
  };
}
