import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../../../config/index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Search Service API',
      version: '1.0.0',
      description: 'Servizio di ricerca immobiliare - Gestisce ricerche avanzate, suggerimenti, ricerche salvate e storico delle ricerche.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.search.port || 3003}/api`,
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
        SearchFilters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Testo di ricerca libera',
              example: 'appartamento centro milano'
            },
            city: {
              type: 'string',
              description: 'Filtro per città',
              example: 'Milano'
            },
            province: {
              type: 'string',
              description: 'Filtro per provincia',
              example: 'MI'
            },
            zipCode: {
              type: 'string',
              description: 'Filtro per CAP',
              example: '20121'
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
            status: {
              type: 'string',
              enum: ['active', 'pending', 'sold', 'rented', 'withdrawn'],
              description: 'Stato dell\'annuncio',
              example: 'active'
            },
            priceMin: {
              type: 'number',
              minimum: 0,
              description: 'Prezzo minimo in euro',
              example: 200000
            },
            priceMax: {
              type: 'number',
              minimum: 0,
              description: 'Prezzo massimo in euro',
              example: 500000
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
            areaMin: {
              type: 'number',
              minimum: 1,
              description: 'Superficie minima in mq',
              example: 80
            },
            areaMax: {
              type: 'number',
              minimum: 1,
              description: 'Superficie massima in mq',
              example: 150
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
            radius: {
              type: 'number',
              minimum: 0.1,
              maximum: 100,
              description: 'Raggio di ricerca in km (per ricerca geografica)',
              example: 5
            },
            centerLat: {
              type: 'number',
              format: 'float',
              description: 'Latitudine centro ricerca (per ricerca geografica)',
              example: 45.4642
            },
            centerLng: {
              type: 'number',
              format: 'float',
              description: 'Longitudine centro ricerca (per ricerca geografica)',
              example: 9.1900
            },
            features: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Caratteristiche specifiche richieste',
              example: ['aria condizionata', 'riscaldamento autonomo']
            },
            sortBy: {
              type: 'string',
              enum: ['price_asc', 'price_desc', 'area_asc', 'area_desc', 'date_desc', 'relevance'],
              description: 'Criterio di ordinamento',
              example: 'price_asc',
              default: 'relevance'
            }
          }
        },
        SearchRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/SearchFilters'
            },
            {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Numero di pagina',
                  example: 1,
                  default: 1
                },
                limit: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  description: 'Numero di risultati per pagina (max 100)',
                  example: 20,
                  default: 20
                }
              }
            }
          ]
        },
        PropertyResult: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco della proprietà',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              example: 'Appartamento moderno con vista panoramica'
            },
            description: {
              type: 'string',
              example: 'Splendido appartamento di 120mq completamente ristrutturato...'
            },
            price: {
              type: 'number',
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
              type: 'object',
              properties: {
                street: { type: 'string', example: 'Via Roma 123' },
                city: { type: 'string', example: 'Milano' },
                province: { type: 'string', example: 'MI' },
                zipCode: { type: 'string', example: '20121' },
                country: { type: 'string', example: 'Italy' }
              }
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 45.4642 },
                longitude: { type: 'number', example: 9.1900 }
              }
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  url: { type: 'string' },
                  alt: { type: 'string' },
                  isPrimary: { type: 'boolean' },
                  order: { type: 'integer' }
                }
              }
            },
            agentId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            agent: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                agencyName: { type: 'string' }
              }
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            views: {
              type: 'integer',
              example: 245
            },
            favorites: {
              type: 'integer',
              example: 12
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T15:45:00.000Z'
            },
            relevanceScore: {
              type: 'number',
              format: 'float',
              description: 'Punteggio di rilevanza (0-1)',
              example: 0.95
            },
            distance: {
              type: 'number',
              format: 'float',
              description: 'Distanza in km dal centro di ricerca (solo per ricerche geografiche)',
              example: 2.3
            }
          }
        },
        SearchResult: {
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
                    $ref: '#/components/schemas/PropertyResult'
                  }
                },
                totalCount: {
                  type: 'integer',
                  description: 'Numero totale di risultati',
                  example: 1547
                },
                currentPage: {
                  type: 'integer',
                  description: 'Pagina corrente',
                  example: 1
                },
                totalPages: {
                  type: 'integer',
                  description: 'Numero totale di pagine',
                  example: 78
                },
                hasNextPage: {
                  type: 'boolean',
                  example: true
                },
                hasPreviousPage: {
                  type: 'boolean',
                  example: false
                },
                searchTime: {
                  type: 'number',
                  description: 'Tempo di esecuzione in millisecondi',
                  example: 45
                },
                appliedFilters: {
                  $ref: '#/components/schemas/SearchFilters'
                }
              }
            },
            message: {
              type: 'string',
              example: 'Search completed successfully'
            }
          }
        },
        SearchSuggestion: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description: 'Valore del suggerimento',
              example: 'Milano, MI'
            },
            type: {
              type: 'string',
              enum: ['location', 'property_type', 'feature'],
              description: 'Tipo di suggerimento',
              example: 'location'
            },
            count: {
              type: 'integer',
              description: 'Numero di proprietà associate',
              example: 1245
            }
          }
        },
        SavedSearch: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Nome della ricerca salvata',
              example: 'Appartamenti Milano Centro'
            },
            filters: {
              $ref: '#/components/schemas/SearchFilters'
            },
            isNotificationEnabled: {
              type: 'boolean',
              description: 'Indica se le notifiche sono abilitate per nuovi risultati',
              example: true
            },
            lastResultCount: {
              type: 'integer',
              description: 'Numero di risultati dell\'ultima esecuzione',
              example: 47
            },
            hasNewResults: {
              type: 'boolean',
              description: 'Indica se ci sono nuovi risultati dall\'ultima visualizzazione',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T15:45:00.000Z'
            }
          }
        },
        SavedSearchCreate: {
          type: 'object',
          required: ['name', 'filters'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Nome della ricerca salvata',
              example: 'Appartamenti Milano Centro'
            },
            filters: {
              $ref: '#/components/schemas/SearchFilters'
            },
            isNotificationEnabled: {
              type: 'boolean',
              description: 'Abilita notifiche per nuovi risultati',
              example: true,
              default: false
            }
          }
        },
        SavedSearchUpdate: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Nome della ricerca salvata',
              example: 'Appartamenti Milano Centro - Aggiornata'
            },
            filters: {
              $ref: '#/components/schemas/SearchFilters'
            },
            isNotificationEnabled: {
              type: 'boolean',
              description: 'Abilita/disabilita notifiche',
              example: false
            }
          }
        },
        SearchHistory: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            filters: {
              $ref: '#/components/schemas/SearchFilters'
            },
            resultCount: {
              type: 'integer',
              description: 'Numero di risultati ottenuti',
              example: 156
            },
            searchedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora della ricerca',
              example: '2025-09-28T14:30:00.000Z'
            },
            source: {
              type: 'string',
              enum: ['web', 'mobile', 'api'],
              description: 'Origine della ricerca',
              example: 'web'
            },
            executionTime: {
              type: 'number',
              description: 'Tempo di esecuzione in millisecondi',
              example: 67
            }
          }
        },
        SearchHistoryResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                history: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/SearchHistory'
                  }
                },
                totalCount: {
                  type: 'integer',
                  example: 89
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
              example: 'Invalid search parameters'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'priceMin'
                  },
                  message: {
                    type: 'string',
                    example: 'Price minimum must be greater than 0'
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            },
            path: {
              type: 'string',
              example: '/search'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'search-service'
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
        name: 'Search',
        description: 'Ricerca proprietà con filtri avanzati'
      },
      {
        name: 'Search Suggestions',
        description: 'Suggerimenti per la ricerca'
      },
      {
        name: 'Saved Searches',
        description: 'Gestione delle ricerche salvate'
      },
      {
        name: 'Search History',
        description: 'Storico delle ricerche effettuate'
      },
      {
        name: 'Health',
        description: 'Endpoint per il controllo dello stato del servizio'
      }
    ]
  },
  apis: [
    './src/services/search-service/routes/*.ts',
    './src/services/search-service/index.ts'
  ]
};

export const specs = swaggerJsdoc(options);