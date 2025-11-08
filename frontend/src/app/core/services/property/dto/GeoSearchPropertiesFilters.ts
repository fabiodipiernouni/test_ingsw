import {GeoJSONPoint} from '@service-shared/types/geojson.types';
import {RadiusSearch} from '@service-shared/dto/RadiusSearch';

export class GeoSearchPropertiesFilters {
  // Geographic search - polygon search (ricerca per area poligonale)
  // Cerca tutte le proprietà all'interno di un'area poligonale definita da punti GeoJSON.
  // Il poligono viene chiuso automaticamente se necessario.
  // Minimo 3 punti richiesti. Non può essere usato insieme a radius search.
  polygon?: GeoJSONPoint[];

  // Geographic search - radius search (ricerca per raggio da punto centrale)
  // Cerca tutte le proprietà entro un raggio specificato da un punto centrale.
  // Non può essere usato insieme a polygon search (sono mutuamente esclusivi).
  radiusSearch?: RadiusSearch;
}
