import { User } from '@shared/database/models/User';
import { UserModel } from '@user/models/UserModel';
import { UserRole } from '@user/models/UserRole';
import { Op, Sequelize } from 'sequelize';
import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';
import { GeoJSONPoint } from '@shared/types/geojson.types';
import { Location } from '@shared/models/location';
import logger from '@shared/utils/logger';

function extractCoordinates(center: GeoJSONPoint): Location {
  return {
    longitude: center.coordinates[0],
    latitude: center.coordinates[1]
  };
}

/**
 * Helper class per conversioni e utility varie
 */
export class Helper {
  /**
   * Converte un'istanza di User (Sequelize) in UserModel (interfaccia)
   * @param user - L'istanza User da convertire
   * @returns L'oggetto UserModel
   */
  static userToUserModel(user: User): UserModel {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      avatar: user.avatar,
      phone: user.phone,
      isVerified: user.isVerified,
      isActive: user.isActive,
      passwordChangeRequired: user.passwordChangeRequired,
      linkedProviders: user.linkedProviders || [],
      cognitoSub: user.cognitoSub,
      cognitoUsername: user.cognitoUsername,
      lastLoginAt: user.lastLoginAt,
      agencyId: user.agencyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  static applySearchFilters(whereClause: any, geoFilters: SearchPropertiesFilters): void {
    if (geoFilters.location) {
      whereClause[Op.or] = [
        Sequelize.where(
          Sequelize.fn('UPPER', Sequelize.col('city')),
          'LIKE',
          `%${geoFilters.location.toUpperCase()}%`
        ),
        Sequelize.where(
          Sequelize.fn('UPPER', Sequelize.col('province')),
          'LIKE',
          `%${geoFilters.location.toUpperCase()}%`
        ),
        Sequelize.where(
          Sequelize.fn('UPPER', Sequelize.col('zipCode')),
          'LIKE',
          `%${geoFilters.location.toUpperCase()}%`
        )
      ];
    }

    // Filtro prezzo
    if (geoFilters.priceMin !== undefined && geoFilters.priceMax !== undefined) {
      whereClause.price = { [Op.between]: [geoFilters.priceMin, geoFilters.priceMax] };
    } else if (geoFilters.priceMin !== undefined || geoFilters.priceMax !== undefined) {
      whereClause.price = {};

      if (geoFilters.priceMin !== undefined) {
        whereClause.price[Op.gte] = geoFilters.priceMin;
      }

      if (geoFilters.priceMax !== undefined) {
        whereClause.price[Op.lte] = geoFilters.priceMax;
      }
    }

    // Filtro tipo proprietà
    if (geoFilters.propertyType) {
      whereClause.propertyType = geoFilters.propertyType;
    }

    // Filtro tipo annuncio
    if (geoFilters.listingType) {
      whereClause.listingType = geoFilters.listingType;
    }

    if(geoFilters.rooms) {
      whereClause.rooms = { [Op.gte]: geoFilters.rooms };
    }

    // Filtro camere da letto
    if (geoFilters.bedrooms !== undefined) {
      whereClause.bedrooms = { [Op.gte]: geoFilters.bedrooms };
    }

    // Filtro bagni
    if (geoFilters.bathrooms !== undefined) {
      whereClause.bathrooms = { [Op.gte]: geoFilters.bathrooms };
    }
  }

  static applyGeoSearchFilters(whereClause: any, geoFilters: GeoSearchPropertiesFilters) {
    // ===== RICERCA GEOGRAFICA PER RAGGIO (usando Oracle Spatial con GeoJSON) =====
    if (geoFilters.radiusSearch) {
      const { center, radius } = geoFilters.radiusSearch;
      const radiusMeters = radius * 1000; // converti km in metri
      const { longitude: centerLng, latitude: centerLat } = extractCoordinates(center);

      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(
        Sequelize.literal(`
          SDO_WITHIN_DISTANCE(
            SDO_GEOMETRY(
              2001,                                    -- tipo: Point 2D
              4326,                                    -- SRID: WGS84
              SDO_POINT_TYPE(
                TO_NUMBER(JSON_VALUE("Property"."geo_location", '$.coordinates[0]')),  -- longitude
                TO_NUMBER(JSON_VALUE("Property"."geo_location", '$.coordinates[1]')),  -- latitude
                NULL
              ),
              NULL,
              NULL
            ),
            SDO_GEOMETRY(
              2001,
              4326,
              SDO_POINT_TYPE(${centerLng}, ${centerLat}, NULL),
              NULL,
              NULL
            ),
            'distance=${radiusMeters} unit=M'       -- distanza in metri
          ) = 'TRUE'
        `)
      );
    }
    else if (geoFilters.polygon && geoFilters.polygon.length >= 3) {
      // ===== RICERCA GEOGRAFICA PER POLIGONO (usando Oracle Spatial con GeoJSON) =====
      let polygonCoords = geoFilters.polygon
        .map(point => {
          const { longitude, latitude } = extractCoordinates(point);
          return `${longitude}, ${latitude}`;
        })
        .join(', ');

      // Chiude automaticamente il poligono se non è già chiuso
      const firstPoint = geoFilters.polygon[0];
      const lastPoint = geoFilters.polygon[geoFilters.polygon.length - 1];
      const firstCoords = extractCoordinates(firstPoint);
      const lastCoords = extractCoordinates(lastPoint);

      if (firstCoords.longitude !== lastCoords.longitude ||
        firstCoords.latitude !== lastCoords.latitude) {
        polygonCoords += `, ${firstCoords.longitude}, ${firstCoords.latitude}`;
      }

      // Aggiunge condizione WHERE con Oracle Spatial
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(
        Sequelize.literal(`
          SDO_CONTAINS(
            SDO_GEOMETRY(
              2003,                                    -- tipo: Polygon 2D
              4326,                                    -- SRID: WGS84
              NULL,                                    -- punto singolo (non usato)
              SDO_ELEM_INFO_ARRAY(1, 1003, 1),       -- elemento poligono esterno
              SDO_ORDINATE_ARRAY(${polygonCoords})   -- coordinate poligono
            ),
            SDO_GEOMETRY(
              2001,                                    -- tipo: Point 2D
              4326,                                    -- SRID: WGS84
              SDO_POINT_TYPE(
                TO_NUMBER(JSON_VALUE("Property"."geo_location", '$.coordinates[0]')),  -- longitude
                TO_NUMBER(JSON_VALUE("Property"."geo_location", '$.coordinates[1]')),  -- latitude
                NULL
              ),
              NULL,
              NULL
            )
          ) = 'TRUE'
        `)
      );

      logger.debug('Polygon search enabled', {
        points: geoFilters.polygon.length,
        closed: polygonCoords
      });      
    }
  }


}
