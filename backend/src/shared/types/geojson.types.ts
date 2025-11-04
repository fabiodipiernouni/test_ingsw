/**
 * GeoJSON Types - Shared across all services
 * Standard RFC 7946 - https://tools.ietf.org/html/rfc7946
 */

import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GeoJSON Point
 * Rappresenta un punto geografico in formato GeoJSON standard
 * Formato: { type: 'Point', coordinates: [longitude, latitude] }
 * 
 * ⚠️ IMPORTANTE: L'ordine delle coordinate è [longitude, latitude], non [lat, lng]!
 */
export class GeoJSONPoint {
  @IsIn(['Point'], { message: 'Type must be "Point"' })
  type: string = 'Point';

  @IsArray({ message: 'Coordinates must be an array' })
  @ArrayMinSize(2, { message: 'Coordinates must have exactly 2 elements' })
  @ArrayMaxSize(2, { message: 'Coordinates must have exactly 2 elements' })
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Each coordinate must be a valid number' })
  coordinates!: number[]; // [longitude, latitude]
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
 * Valida che le coordinate siano valide secondo lo standard GeoJSON
 * 
 * @param longitude - Longitudine (deve essere tra -180 e 180)
 * @param latitude - Latitudine (deve essere tra -90 e 90)
 * @returns GeoJSONPoint object
 * @throws Error se le coordinate non sono valide
 */
export function createGeoJSONPoint(longitude: number, latitude: number): GeoJSONPoint {
  // Validazione longitude: deve essere tra -180 e 180
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  // Validazione latitude: deve essere tra -90 e 90
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
}