/**
 * Test suite for GeoJSON types and functions
 * Testing with R-WECT (Robustness Worst-case Execution Coverage Testing)
 */

import { describe, it, expect } from '@jest/globals';
import { createGeoJSONPoint, GeoJSONPoint } from './geojson.types';

describe('createGeoJSONPoint', () => {
  
    it('TC1: should throw error', () => {
        expect(() => createGeoJSONPoint(-180.1, 0)).toThrow();
    });

    it('TC2: should throw error', () => {
      expect(() => createGeoJSONPoint(180.1, 0)).toThrow();
    });

    it('TC3: should throw error', () => {
      expect(() => createGeoJSONPoint(0, -90.1)).toThrow();
    });

    it('TC4: should throw error', () => {
      expect(() => createGeoJSONPoint(0, 90.1)).toThrow();
    });

    it('TC5: should create valid GeoJSONPoint', () => {
      const result: GeoJSONPoint = createGeoJSONPoint(1, 0);
      
      expect(result).toEqual({
        type: 'Point',
        coordinates: [1, 0]
      });
      expect(result.type).toBe('Point');
      expect(result.coordinates).toHaveLength(2);
      expect(result.coordinates[0]).toBe(1);
      expect(result.coordinates[1]).toBe(0);
    });

});
