import { User } from '@shared/database/models/User';
import { UserModel } from '@shared/models/UserModel';
import { UserRole } from '@shared/types/user.types';
import { Op, Sequelize } from 'sequelize';
import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';
import { GeoJSONPoint } from '@shared/types/geojson.types';
import { Location } from '@shared/models/Location';
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
      lastLoginAt: user.lastLoginAt,
      agencyId: user.agencyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      licenseNumber: user.licenseNumber,
      biography: user.biography,
      specializations: user.specializations
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
          Sequelize.fn('UPPER', Sequelize.col('Property.zip_code')),
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
    if (geoFilters.polygon && geoFilters.polygon.length >= 3) {
      let polygonCoords = geoFilters.polygon
        .map(point => {
          const { longitude, latitude } = extractCoordinates(point);
          return `${longitude}, ${latitude}`;
        })
        .join(', ');

      const firstPoint = geoFilters.polygon[0];
      const lastPoint = geoFilters.polygon[geoFilters.polygon.length - 1];
      const firstCoords = extractCoordinates(firstPoint);
      const lastCoords = extractCoordinates(lastPoint);

      // Controlla se il poligono è già chiuso
      if (firstCoords.longitude !== lastCoords.longitude ||
        firstCoords.latitude !== lastCoords.latitude) {
        // Chiudi il poligono ripetendo il primo punto alla fine
        polygonCoords += `, ${firstCoords.longitude}, ${firstCoords.latitude}`;
      }

      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(
        Sequelize.literal(`
        SDO_CONTAINS(
          SDO_GEOMETRY(
            2003,
            4326,
            NULL,
            SDO_ELEM_INFO_ARRAY(1, 1003, 1),
            SDO_ORDINATE_ARRAY(${polygonCoords})
          ),
          geom_point
        ) = 'TRUE'
      `)
      );

      logger.debug('Polygon search enabled', {
        points: geoFilters.polygon.length,
        closed: polygonCoords
      });
    } else if (geoFilters.radiusSearch) {
      const { center, radius } = geoFilters.radiusSearch;
      const radiusMeters = radius * 1000; // converti km in metri
      const { longitude, latitude } = extractCoordinates(center);

      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(
        Sequelize.literal(`
        SDO_WITHIN_DISTANCE(
          geom_point,
          SDO_GEOMETRY(
            2001,
            4326,
            SDO_POINT_TYPE(${longitude}, ${latitude}, NULL),
            NULL,
            NULL
          ),
          'distance=${radiusMeters} unit=M'
        ) = 'TRUE'
      `)
      );
    }
  }



}
