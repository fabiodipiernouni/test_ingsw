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
        // Request DTOs
        CreatePropertyRequest: {
          type: 'object',
          required: ['title', 'description', 'price', 'propertyType', 'listingType', 'bedrooms', 'bathrooms', 'area', 'address', 'location'],
          properties: {
            title: {
              type: 'string',
              minLength: 10,
              maxLength: 200,
              example: 'Appartamento luminoso in centro'
            },
            description: {
              type: 'string',
              minLength: 50,
              maxLength: 2000,
              example: 'Splendido appartamento di 100mq situato nel cuore della città...'
            },
            price: {
              type: 'number',
              minimum: 1,
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
            bedrooms: {
              type: 'integer',
              minimum: 0,
              maximum: 20,
              example: 3
            },
            bathrooms: {
              type: 'integer',
              minimum: 0,
              maximum: 20,
              example: 2
            },
            area: {
              type: 'number',
              minimum: 1,
              maximum: 10000,
              example: 100
            },
            floor: {
              type: 'string',
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
              maxItems: 20,
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

        // Response DTOs
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

        PropertyCardDto: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
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
            city: { type: 'string' },
            province: { type: 'string' },
            primaryImage: {
              $ref: '#/components/schemas/PropertyImageModel'
            },
            energyClass: {
              type: 'string',
              enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
            },
            hasElevator: { type: 'boolean' },
            hasBalcony: { type: 'boolean' },
            hasGarden: { type: 'boolean' },
            hasParking: { type: 'boolean' },
            agentId: { type: 'string' },
            views: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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
              pattern: '^\\d{5}$',
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

        // Success Responses
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

        // Error Responses
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
              }
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
      }
    ]
  },
  apis: ['./src/services/property-service/routes/*.ts']
};

export const specs = swaggerJsdoc(options);
export const swaggerSpec = specs;
