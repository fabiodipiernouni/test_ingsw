import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Property Service API',
      version: '1.0.0',
      description: 'API per la gestione delle proprietà immobiliari',
      contact: {
        name: 'DietiEstates',
        email: 'support@dietiestates.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // ==================== REQUEST DTOs ====================

        CreatePropertyRequest: {
          type: 'object',
          required: ['title', 'description', 'price', 'propertyType', 'listingType', 'status', 'rooms', 'bedrooms', 'bathrooms', 'area', 'address', 'location'],
          properties: {
            title: {
              type: 'string',
              maxLength: 200,
              example: 'Appartamento luminoso in centro'
            },
            description: {
              type: 'string',
              maxLength: 4000,
              example: 'Splendido appartamento di 100mq situato nel cuore della città...'
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 99999999.99,
              example: 250000
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'],
              example: 'apartment'
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent'],
              example: 'sale'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
              example: 'active'
            },
            rooms: {
              type: 'integer',
              minimum: 0,
              example: 4
            },
            bedrooms: {
              type: 'integer',
              minimum: 0,
              example: 3
            },
            bathrooms: {
              type: 'integer',
              minimum: 0,
              example: 2
            },
            area: {
              type: 'number',
              minimum: 0,
              maximum: 999999.99,
              example: 100
            },
            floor: {
              type: 'string',
              maxLength: 50,
              example: '2'
            },
            energyClass: {
              type: 'string',
              enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
              example: 'B'
            },
            hasElevator: {
              type: 'boolean',
              example: true
            },
            hasBalcony: {
              type: 'boolean',
              example: true
            },
            hasGarden: {
              type: 'boolean',
              example: false
            },
            hasParking: {
              type: 'boolean',
              example: true
            },
            features: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['aria condizionata', 'riscaldamento autonomo', 'doppi vetri']
            },
            address: {
              $ref: '#/components/schemas/Address'
            },
            location: {
              $ref: '#/components/schemas/GeoJSONPoint'
            }
          }
        },

        GetPropertiesCardsRequest: {
          type: 'object',
          properties: {
            filters: {
              $ref: '#/components/schemas/SearchPropertiesFilters'
            },
            geoFilters: {
              $ref: '#/components/schemas/GeoSearchPropertiesFilters'
            },
            pagedRequest: {
              $ref: '#/components/schemas/PagedRequest'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
              description: 'Filtra per stato (solo per agenti e admin)'
            },
            agencyId: {
              type: 'string',
              format: 'uuid',
              description: 'Filtra per agenzia specifica (solo per admin)'
            }
          }
        },

        GetGeoPropertiesCardsRequest: {
          type: 'object',
          required: ['sortBy'],
          properties: {
            filters: {
              $ref: '#/components/schemas/SearchPropertiesFilters'
            },
            geoFilters: {
              $ref: '#/components/schemas/GeoSearchPropertiesFilters'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
              description: 'Filtra per stato (solo per agenti e admin)'
            },
            agencyId: {
              type: 'string',
              format: 'uuid',
              description: 'Filtra per agenzia specifica (solo per admin)'
            },
            sortBy: {
              type: 'string',
              example: 'createdAt',
              description: 'Campo per ordinamento'
            },
            sortOrder: {
              type: 'string',
              enum: ['ASC', 'DESC'],
              default: 'DESC',
              example: 'DESC',
              description: 'Direzione ordinamento'
            }
          }
        },

        GetPropertiesByIdListRequest: {
          type: 'object',
          required: ['ids'],
          properties: {
            ids: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid'
              },
              minItems: 1,
              description: 'Lista di ID delle proprietà',
              example: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
            },
            sortBy: {
              type: 'string',
              example: 'createdAt',
              description: 'Campo per ordinamento'
            },
            sortOrder: {
              type: 'string',
              enum: ['ASC', 'DESC'],
              default: 'DESC',
              example: 'DESC'
            }
          }
        },

        SearchPropertiesFilters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Città o CAP',
              example: 'Napoli'
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'],
              example: 'apartment'
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent'],
              example: 'sale'
            },
            priceMin: {
              type: 'number',
              minimum: 0,
              maximum: 9990000,
              example: 100000
            },
            priceMax: {
              type: 'number',
              minimum: 0,
              maximum: 10000000,
              example: 500000
            },
            rooms: {
              type: 'integer',
              minimum: 0,
              description: 'Numero minimo di stanze',
              example: 3
            },
            bedrooms: {
              type: 'integer',
              minimum: 0,
              description: 'Numero minimo di camere',
              example: 2
            },
            bathrooms: {
              type: 'integer',
              minimum: 0,
              description: 'Numero minimo di bagni',
              example: 1
            },
            hasElevator: {
              type: 'boolean',
              example: true
            },
            hasBalcony: {
              type: 'boolean',
              example: true
            },
            hasGarden: {
              type: 'boolean',
              example: false
            },
            hasParking: {
              type: 'boolean',
              example: true
            }
          }
        },

        GeoSearchPropertiesFilters: {
          type: 'object',
          properties: {
            polygon: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GeoJSONPoint'
              },
              minItems: 3,
              maxItems: 100,
              description: 'Ricerca per area poligonale (minimo 3 punti). Non può essere usato con radiusSearch.'
            },
            radiusSearch: {
              $ref: '#/components/schemas/RadiusSearch',
              description: 'Ricerca per raggio da punto centrale. Non può essere usato con polygon.'
            }
          }
        },

        RadiusSearch: {
          type: 'object',
          required: ['center', 'radius'],
          properties: {
            center: {
              $ref: '#/components/schemas/GeoJSONPoint',
              description: 'Punto centrale della ricerca'
            },
            radius: {
              type: 'number',
              minimum: 0,
              maximum: 500,
              description: 'Raggio in chilometri (max 500km)',
              example: 10
            }
          }
        },

        PagedRequest: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20,
              example: 20
            },
            sortBy: {
              type: 'string',
              default: 'createdAt',
              example: 'createdAt'
            },
            sortOrder: {
              type: 'string',
              enum: ['ASC', 'DESC'],
              default: 'DESC',
              example: 'DESC'
            }
          }
        },

        PropertyViewRequest: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              default: 'web',
              example: 'web',
              description: 'Fonte della visualizzazione'
            }
          }
        },

        PropertyImageMetadata: {
          type: 'object',
          required: ['isPrimary', 'order'],
          properties: {
            isPrimary: {
              type: 'boolean',
              description: 'Se questa è l\'immagine principale',
              example: true
            },
            order: {
              type: 'integer',
              minimum: 0,
              maximum: 99,
              description: 'Ordine di visualizzazione dell\'immagine',
              example: 0
            },
            caption: {
              type: 'string',
              maxLength: 500,
              description: 'Didascalia dell\'immagine',
              example: 'Soggiorno luminoso'
            },
            altText: {
              type: 'string',
              maxLength: 255,
              description: 'Testo alternativo per accessibilità',
              example: 'Vista del soggiorno con finestre panoramiche'
            }
          }
        },

        // ==================== RESPONSE DTOs ====================

        PropertyCardDto: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },
            title: {
              type: 'string',
              example: 'Appartamento luminoso in centro'
            },
            description: {
              type: 'string',
              example: 'Splendido appartamento...'
            },
            price: {
              type: 'number',
              example: 250000
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'],
              example: 'apartment'
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent'],
              example: 'sale'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
              example: 'active'
            },
            rooms: {
              type: 'integer',
              example: 4
            },
            bedrooms: {
              type: 'integer',
              example: 3
            },
            bathrooms: {
              type: 'integer',
              example: 2
            },
            area: {
              type: 'number',
              example: 100
            },
            floor: {
              type: 'string',
              example: '2'
            },
            city: {
              type: 'string',
              example: 'Napoli'
            },
            province: {
              type: 'string',
              example: 'NA'
            },
            primaryImage: {
              $ref: '#/components/schemas/PropertyImageModel'
            },
            energyClass: {
              type: 'string',
              enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
              example: 'B'
            },
            hasElevator: {
              type: 'boolean',
              example: true
            },
            hasBalcony: {
              type: 'boolean',
              example: true
            },
            hasGarden: {
              type: 'boolean',
              example: false
            },
            hasParking: {
              type: 'boolean',
              example: true
            },
            agentId: {
              type: 'string',
              format: 'uuid'
            },
            views: {
              type: 'integer',
              example: 45
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-01T10:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-17T15:30:00Z'
            }
          }
        },

        PropertyModel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land']
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent']
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn']
            },
            rooms: { type: 'integer' },
            bedrooms: { type: 'integer' },
            bathrooms: { type: 'integer' },
            area: { type: 'number' },
            floor: { type: 'string' },
            energyClass: {
              type: 'string',
              enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
            },
            hasElevator: { type: 'boolean' },
            hasBalcony: { type: 'boolean' },
            hasGarden: { type: 'boolean' },
            hasParking: { type: 'boolean' },
            features: {
              type: 'array',
              items: { type: 'string' }
            },
            address: {
              $ref: '#/components/schemas/Address'
            },
            location: {
              $ref: '#/components/schemas/GeoJSONPoint'
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PropertyImageModel'
              }
            },
            agentId: { type: 'string' },
            agent: {
              $ref: '#/components/schemas/UserModel'
            },
            isActive: { type: 'boolean' },
            views: { type: 'integer' },
            favorites: { type: 'integer' },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        PropertyImageModel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fileName: { type: 'string' },
            contentType: { type: 'string' },
            fileSize: { type: 'integer' },
            width: { type: 'integer' },
            height: { type: 'integer' },
            caption: { type: 'string' },
            alt: { type: 'string' },
            isPrimary: { type: 'boolean' },
            order: { type: 'integer' },
            uploadDate: { type: 'string', format: 'date-time' },
            urls: {
              type: 'object',
              properties: {
                original: { type: 'string' },
                small: { type: 'string' },
                medium: { type: 'string' },
                large: { type: 'string' }
              }
            }
          }
        },

        UserModel: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' }
          }
        },

        // ==================== COMMON SCHEMAS ====================

        Address: {
          type: 'object',
          required: ['street', 'city', 'province', 'zipCode', 'country'],
          properties: {
            street: {
              type: 'string',
              minLength: 5,
              example: 'Via Roma 123'
            },
            city: {
              type: 'string',
              minLength: 2,
              example: 'Napoli'
            },
            province: {
              type: 'string',
              minLength: 2,
              example: 'NA'
            },
            zipCode: {
              type: 'string',
              pattern: String.raw`^\d{5}$`,
              example: '80100'
            },
            country: {
              type: 'string',
              example: 'Italy'
            }
          }
        },

        GeoJSONPoint: {
          type: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: {
              type: 'string',
              enum: ['Point'],
              example: 'Point'
            },
            coordinates: {
              type: 'array',
              items: {
                type: 'number'
              },
              minItems: 2,
              maxItems: 2,
              description: '[longitude, latitude]',
              example: [14.2681244, 40.8517746]
            }
          }
        },

        // ==================== API RESPONSES ====================

        ApiSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        PropertyCardsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                properties: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/PropertyCardDto'
                  }
                },
                totalCount: {
                  type: 'integer',
                  example: 100
                },
                currentPage: {
                  type: 'integer',
                  example: 1
                },
                totalPages: {
                  type: 'integer',
                  example: 5
                },
                hasNextPage: {
                  type: 'boolean',
                  example: true
                },
                hasPreviousPage: {
                  type: 'boolean',
                  example: false
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        PropertyResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              $ref: '#/components/schemas/PropertyModel'
            },
            message: {
              type: 'string'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        CreatePropertyResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              $ref: '#/components/schemas/PropertyModel'
            },
            message: {
              type: 'string',
              example: 'Property created successfully'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        RecordViewResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'View recorded'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // ==================== ERROR RESPONSES ====================

        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'INTERNAL_SERVER_ERROR'
            },
            message: {
              type: 'string',
              example: 'An error occurred'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            path: {
              type: 'string'
            }
          }
        },

        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['title must be at least 10 characters', 'price must be a positive number']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Properties',
        description: 'Gestione delle proprietà immobiliari'
      },
      {
        name: 'Property Views',
        description: 'Tracking delle visualizzazioni delle proprietà'
      }
    ]
  },
  apis: ['./src/services/property-service/routes/*.ts']
};

export const specs = swaggerJsdoc(options);
