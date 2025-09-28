import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../../../config/index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Property Service API',
      version: '1.0.0',
      description: 'Servizio di gestione delle proprietà immobiliari - Gestisce creazione, modifica, visualizzazione e gestione delle proprietà.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.property.port || 3002}`,
        description: 'Server di sviluppo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT per l\'autenticazione. Formato: Bearer {token}'
        }
      },
      schemas: {
        PropertyAddress: {
          type: 'object',
          required: ['street', 'city', 'province', 'zipCode', 'country'],
          properties: {
            street: {
              type: 'string',
              description: 'Indirizzo via e numero civico',
              example: 'Via Roma 123'
            },
            city: {
              type: 'string',
              description: 'Città',
              example: 'Milano'
            },
            province: {
              type: 'string',
              description: 'Provincia',
              example: 'MI'
            },
            zipCode: {
              type: 'string',
              description: 'Codice postale',
              example: '20121'
            },
            country: {
              type: 'string',
              description: 'Paese',
              example: 'Italy'
            }
          }
        },
        PropertyLocation: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: {
              type: 'number',
              format: 'float',
              description: 'Latitudine GPS',
              example: 45.4642
            },
            longitude: {
              type: 'number',
              format: 'float',
              description: 'Longitudine GPS',
              example: 9.1900
            }
          }
        },
        PropertyImage: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco dell\'immagine',
              example: '507f1f77bcf86cd799439011'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL dell\'immagine',
              example: 'https://example.com/images/property1.jpg'
            },
            alt: {
              type: 'string',
              description: 'Testo alternativo per l\'immagine',
              example: 'Vista principale dell\'appartamento'
            },
            isPrimary: {
              type: 'boolean',
              description: 'Indica se è l\'immagine principale',
              example: true
            },
            order: {
              type: 'integer',
              description: 'Ordine di visualizzazione',
              example: 1
            }
          }
        },
        Agent: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco dell\'agente',
              example: '507f1f77bcf86cd799439011'
            },
            firstName: {
              type: 'string',
              description: 'Nome dell\'agente',
              example: 'Mario'
            },
            lastName: {
              type: 'string',
              description: 'Cognome dell\'agente',
              example: 'Rossi'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'agente',
              example: 'mario.rossi@agency.com'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono',
              example: '+39 123 456 7890'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'URL dell\'avatar dell\'agente',
              example: 'https://example.com/avatars/agent1.jpg'
            },
            agencyName: {
              type: 'string',
              description: 'Nome dell\'agenzia',
              example: 'Immobiliare Milano'
            },
            licenseNumber: {
              type: 'string',
              description: 'Numero di licenza professionale',
              example: 'LIC123456'
            },
            rating: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 5,
              description: 'Valutazione media (0-5)',
              example: 4.5
            },
            reviewsCount: {
              type: 'integer',
              description: 'Numero di recensioni ricevute',
              example: 127
            }
          }
        },
        PropertyCreateRequest: {
          type: 'object',
          required: ['title', 'description', 'price', 'propertyType', 'listingType', 'bedrooms', 'bathrooms', 'area', 'address', 'location'],
          properties: {
            title: {
              type: 'string',
              minLength: 5,
              maxLength: 200,
              description: 'Titolo della proprietà',
              example: 'Appartamento moderno con vista panoramica'
            },
            description: {
              type: 'string',
              minLength: 20,
              maxLength: 2000,
              description: 'Descrizione dettagliata della proprietà',
              example: 'Splendido appartamento di 120mq completamente ristrutturato...'
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Prezzo in euro',
              example: 450000
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'],
              description: 'Tipo di proprietà',
              example: 'apartment'
            },
            listingType: {
              type: 'string',
              enum: ['sale', 'rent'],
              description: 'Tipo di annuncio',
              example: 'sale'
            },
            bedrooms: {
              type: 'integer',
              minimum: 0,
              description: 'Numero di camere da letto',
              example: 3
            },
            bathrooms: {
              type: 'integer',
              minimum: 1,
              description: 'Numero di bagni',
              example: 2
            },
            area: {
              type: 'number',
              minimum: 1,
              description: 'Superficie in metri quadri',
              example: 120
            },
            floor: {
              type: 'string',
              description: 'Piano dell\'immobile',
              example: '3'
            },
            energyClass: {
              type: 'string',
              enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
              description: 'Classe energetica',
              example: 'B'
            },
            hasElevator: {
              type: 'boolean',
              description: 'Presenza di ascensore',
              example: true
            },
            hasBalcony: {
              type: 'boolean',
              description: 'Presenza di balcone/terrazzo',
              example: true
            },
            hasGarden: {
              type: 'boolean',
              description: 'Presenza di giardino',
              example: false
            },
            hasParking: {
              type: 'boolean',
              description: 'Presenza di parcheggio/box',
              example: true
            },
            features: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Caratteristiche aggiuntive',
              example: ['aria condizionata', 'riscaldamento autonomo', 'infissi nuovi']
            },
            address: {
              $ref: '#/components/schemas/PropertyAddress'
            },
            location: {
              $ref: '#/components/schemas/PropertyLocation'
            }
          }
        },
        PropertyResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco della proprietà',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              description: 'Titolo della proprietà',
              example: 'Appartamento moderno con vista panoramica'
            },
            description: {
              type: 'string',
              description: 'Descrizione dettagliata',
              example: 'Splendido appartamento di 120mq completamente ristrutturato...'
            },
            price: {
              type: 'number',
              description: 'Prezzo in euro',
              example: 450000
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
              description: 'Stato dell\'annuncio',
              example: 'active'
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
              example: 120
            },
            floor: {
              type: 'string',
              example: '3'
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
              example: ['aria condizionata', 'riscaldamento autonomo']
            },
            address: {
              $ref: '#/components/schemas/PropertyAddress'
            },
            location: {
              $ref: '#/components/schemas/PropertyLocation'
            },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PropertyImage'
              }
            },
            agentId: {
              type: 'string',
              description: 'ID dell\'agente responsabile',
              example: '507f1f77bcf86cd799439011'
            },
            agent: {
              $ref: '#/components/schemas/Agent'
            },
            isActive: {
              type: 'boolean',
              description: 'Indica se l\'annuncio è attivo',
              example: true
            },
            views: {
              type: 'integer',
              description: 'Numero di visualizzazioni',
              example: 245
            },
            favorites: {
              type: 'integer',
              description: 'Numero di utenti che hanno aggiunto ai preferiti',
              example: 12
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data di creazione',
              example: '2025-09-28T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data ultimo aggiornamento',
              example: '2025-09-28T15:45:00.000Z'
            }
          }
        },
        PropertiesListResponse: {
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
                    $ref: '#/components/schemas/PropertyResponse'
                  }
                },
                totalCount: {
                  type: 'integer',
                  description: 'Numero totale di proprietà',
                  example: 150
                },
                currentPage: {
                  type: 'integer',
                  description: 'Pagina corrente',
                  example: 1
                },
                totalPages: {
                  type: 'integer',
                  description: 'Numero totale di pagine',
                  example: 8
                },
                hasNextPage: {
                  type: 'boolean',
                  description: 'Indica se esiste una pagina successiva',
                  example: true
                },
                hasPreviousPage: {
                  type: 'boolean',
                  description: 'Indica se esiste una pagina precedente',
                  example: false
                }
              }
            }
          }
        },
        PropertyViewRequest: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Origine della visualizzazione',
              example: 'web',
              default: 'web'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Dati della risposta (varia in base all\'endpoint)'
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
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
              description: 'Codice dell\'errore',
              example: 'VALIDATION_ERROR'
            },
            message: {
              type: 'string',
              description: 'Messaggio di errore leggibile',
              example: 'Invalid input data'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'price'
                  },
                  message: {
                    type: 'string',
                    example: 'Price must be greater than 0'
                  }
                }
              },
              description: 'Dettagli degli errori di validazione'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            },
            path: {
              type: 'string',
              description: 'Percorso dell\'endpoint che ha generato l\'errore',
              example: '/properties'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'property-service'
            },
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
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
        name: 'Property Views', //TODO: rimuovere nel caso non lo implementassimo
        description: 'Tracking delle visualizzazioni delle proprietà'
      },
      {
        name: 'Health',
        description: 'Endpoint per il controllo dello stato del servizio'
      }
    ]
  },
  apis: [
    './src/services/property-service/routes/*.ts',
    './src/services/property-service/index.ts'
  ]
};

export const specs = swaggerJsdoc(options);