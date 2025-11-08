import {GeoJSONPoint} from '@service-shared/types/geojson.types';

export interface RadiusSearch {
  center: GeoJSONPoint;     // punto centrale della ricerca in formato GeoJSON
  radius: number;           // raggio in kilometers (max 500km)
}
