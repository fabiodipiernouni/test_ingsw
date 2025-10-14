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
              enum: ['apartment', 'house', 'villa', 'land', 'commercial', 'office', 'garage'],
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
            propertyType: { type: 'string' },
            listingType: { type: 'string' },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn']
            },
            bedrooms: { type: 'integer' },
            bathrooms: { type: 'integer' },
            area: { type: 'number' },
            floor: { type: 'string' },
            energyClass: { type: 'string' },
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
            propertyType: { type: 'string' },
            listingType: { type: 'string' },
            status: { type: 'string' },
            bedrooms: { type: 'integer' },
            bathrooms: { type: 'integer' },
            area: { type: 'number' },
            floor: { type: 'string' },
            city: { type: 'string' },
            province: { type: 'string' },
            primaryImage: {
              $ref: '#/components/schemas/PropertyImageModel'
            },
            energyClass: { type: 'string' },
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
          required: ['street', 'city', 'province', 'zipCode'],
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
              example: [14.2681244, 40.8517746]
            }
          }
        },

        PagedResultPropertyCardDto: {
          type: 'object',
          properties: {
            data: {
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
            }
          }
        },

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
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

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
export const swaggerSpec = specs; // alias per retrocompatibilità
