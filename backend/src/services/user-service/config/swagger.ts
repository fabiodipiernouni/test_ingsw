import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../../../config/index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: 'Servizio di gestione utenti - Gestisce profili utente, preferenze, attività e creazione di agenti/admin.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.user.port || 3004}/api`,
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
        AgencyAddress: {
          type: 'object',
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
        Agency: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco dell\'agenzia',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Nome dell\'agenzia',
              example: 'Immobiliare Milano'
            },
            address: {
              $ref: '#/components/schemas/AgencyAddress'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono dell\'agenzia',
              example: '+39 02 1234567'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'agenzia',
              example: 'info@immobiliaremilano.it'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Sito web dell\'agenzia',
              example: 'https://www.immobiliaremilano.it'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID univoco dell\'utente',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'utente',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              description: 'Nome dell\'utente',
              example: 'Mario'
            },
            lastName: {
              type: 'string',
              description: 'Cognome dell\'utente',
              example: 'Rossi'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono',
              example: '+391234567890'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'URL dell\'avatar dell\'utente',
              example: 'https://example.com/avatars/user123.jpg'
            },
            role: {
              type: 'string',
              enum: ['client', 'agent', 'admin', 'agency_creator'],
              description: 'Ruolo dell\'utente',
              example: 'client'
            },
            agencyId: {
              type: 'string',
              description: 'ID dell\'agenzia (per agenti e admin)',
              example: '507f1f77bcf86cd799439011'
            },
            agencyName: {
              type: 'string',
              description: 'Nome dell\'agenzia',
              example: 'Immobiliare Milano'
            },
            licenseNumber: {
              type: 'string',
              description: 'Numero di licenza (per agenti)',
              example: 'LIC123456'
            },
            isVerified: {
              type: 'boolean',
              description: 'Indica se l\'email è stata verificata',
              example: true
            },
            isActive: {
              type: 'boolean',
              description: 'Indica se l\'account è attivo',
              example: true
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data ultimo accesso',
              example: '2025-09-28T10:30:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data di creazione dell\'account',
              example: '2025-09-20T08:15:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data ultimo aggiornamento',
              example: '2025-09-28T15:45:00.000Z'
            }
          }
        },
        PublicUserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            firstName: {
              type: 'string',
              example: 'Mario'
            },
            lastName: {
              type: 'string',
              example: 'Rossi'
            },
            avatar: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/avatars/user123.jpg'
            },
            role: {
              type: 'string',
              enum: ['client', 'agent', 'admin'],
              example: 'agent'
            },
            agencyName: {
              type: 'string',
              example: 'Immobiliare Milano'
            },
            licenseNumber: {
              type: 'string',
              example: 'LIC123456'
            }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nome dell\'utente',
              example: 'Mario'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Cognome dell\'utente',
              example: 'Rossi'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono',
              example: '+391234567890'
            },
            licenseNumber: {
              type: 'string',
              description: 'Numero di licenza (solo per agenti)',
              example: 'LIC123456'
            }
          }
        },
        UserPreferences: {
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
            language: {
              type: 'string',
              enum: ['it', 'en', 'es', 'fr'],
              description: 'Lingua preferita',
              example: 'it',
              default: 'it'
            },
            currency: {
              type: 'string',
              enum: ['EUR', 'USD', 'GBP'],
              description: 'Valuta preferita',
              example: 'EUR',
              default: 'EUR'
            },
            measurementUnit: {
              type: 'string',
              enum: ['metric', 'imperial'],
              description: 'Sistema di misurazione',
              example: 'metric',
              default: 'metric'
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark', 'auto'],
              description: 'Tema dell\'interfaccia',
              example: 'light',
              default: 'light'
            },
            receiveNewsletters: {
              type: 'boolean',
              description: 'Ricevere newsletter',
              example: true,
              default: false
            },
            receiveMarketingEmails: {
              type: 'boolean',
              description: 'Ricevere email marketing',
              example: false,
              default: false
            },
            privacyLevel: {
              type: 'string',
              enum: ['public', 'private', 'limited'],
              description: 'Livello di privacy del profilo',
              example: 'limited',
              default: 'limited'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-20T08:15:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T15:45:00.000Z'
            }
          }
        },
        UpdateUserPreferencesRequest: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: ['it', 'en', 'es', 'fr'],
              description: 'Lingua preferita',
              example: 'it'
            },
            currency: {
              type: 'string',
              enum: ['EUR', 'USD', 'GBP'],
              description: 'Valuta preferita',
              example: 'EUR'
            },
            measurementUnit: {
              type: 'string',
              enum: ['metric', 'imperial'],
              description: 'Sistema di misurazione',
              example: 'metric'
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark', 'auto'],
              description: 'Tema dell\'interfaccia',
              example: 'dark'
            },
            receiveNewsletters: {
              type: 'boolean',
              description: 'Ricevere newsletter',
              example: true
            },
            receiveMarketingEmails: {
              type: 'boolean',
              description: 'Ricevere email marketing',
              example: false
            },
            privacyLevel: {
              type: 'string',
              enum: ['public', 'private', 'limited'],
              description: 'Livello di privacy del profilo',
              example: 'private'
            }
          }
        },
        NotificationPreferences: {
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
            emailNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche via email',
              example: true,
              default: true
            },
            pushNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche push',
              example: true,
              default: true
            },
            smsNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche SMS',
              example: false,
              default: false
            },
            newPropertyAlerts: {
              type: 'boolean',
              description: 'Avvisi per nuove proprietà',
              example: true,
              default: true
            },
            priceChangeAlerts: {
              type: 'boolean',
              description: 'Avvisi per cambio prezzo',
              example: true,
              default: true
            },
            savedSearchAlerts: {
              type: 'boolean',
              description: 'Avvisi per ricerche salvate',
              example: true,
              default: true
            },
            marketingCommunications: {
              type: 'boolean',
              description: 'Comunicazioni marketing',
              example: false,
              default: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-20T08:15:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T15:45:00.000Z'
            }
          }
        },
        UpdateNotificationPreferencesRequest: {
          type: 'object',
          properties: {
            emailNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche via email',
              example: true
            },
            pushNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche push',
              example: false
            },
            smsNotifications: {
              type: 'boolean',
              description: 'Ricevere notifiche SMS',
              example: false
            },
            newPropertyAlerts: {
              type: 'boolean',
              description: 'Avvisi per nuove proprietà',
              example: true
            },
            priceChangeAlerts: {
              type: 'boolean',
              description: 'Avvisi per cambio prezzo',
              example: true
            },
            savedSearchAlerts: {
              type: 'boolean',
              description: 'Avvisi per ricerche salvate',
              example: false
            },
            marketingCommunications: {
              type: 'boolean',
              description: 'Comunicazioni marketing',
              example: false
            }
          }
        },
        UserActivity: {
          type: 'object',
          properties: {
            recentSearches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  filters: { type: 'object' },
                  searchedAt: { type: 'string', format: 'date-time' }
                }
              },
              description: 'Ricerche recenti'
            },
            favoriteProperties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  propertyId: { type: 'string' },
                  title: { type: 'string' },
                  addedAt: { type: 'string', format: 'date-time' }
                }
              },
              description: 'Proprietà preferite'
            },
            viewedProperties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  propertyId: { type: 'string' },
                  title: { type: 'string' },
                  viewedAt: { type: 'string', format: 'date-time' }
                }
              },
              description: 'Proprietà visualizzate di recente'
            },
            savedSearches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  filters: { type: 'object' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              },
              description: 'Ricerche salvate'
            }
          }
        },
        CreateAgentRequest: {
          type: 'object',
          required: ['email', 'firstName', 'lastName', 'phone', 'licenseNumber'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'agente',
              example: 'agent@example.com'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nome dell\'agente',
              example: 'Marco'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Cognome dell\'agente',
              example: 'Bianchi'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono',
              example: '+39 345 678 9012'
            },
            licenseNumber: {
              type: 'string',
              description: 'Numero di licenza professionale',
              example: 'LIC789012'
            }
          }
        },
        CreateAdminRequest: {
          type: 'object',
          required: ['email', 'firstName', 'lastName', 'phone'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'admin',
              example: 'admin@example.com'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nome dell\'admin',
              example: 'Giulia'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Cognome dell\'admin',
              example: 'Verdi'
            },
            phone: {
              type: 'string',
              description: 'Numero di telefono',
              example: '+39 345 678 9012'
            }
          }
        },
        UserCreationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/UserProfile'
                },
                temporaryPassword: {
                  type: 'string',
                  description: 'Password temporanea per il primo accesso',
                  example: 'TempPass123!'
                }
              }
            },
            message: {
              type: 'string',
              example: 'Agent created successfully'
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
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Valid email is required'
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
              example: '/users/profile'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'user-service'
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
        name: 'User Profile',
        description: 'Gestione del profilo utente'
      },
      {
        name: 'User Preferences',
        description: 'Gestione delle preferenze utente'
      },
      {
        name: 'Notification Preferences',
        description: 'Gestione delle preferenze di notifica'
      },
      { //TODO: rimuovere nel caso non lo implementassimo
        name: 'User Activity',
        description: 'Attività e statistiche dell\'utente'
      },
      {
        name: 'User Management',
        description: 'Creazione e gestione di agenti e admin (solo per ruoli autorizzati)'
      },
      {
        name: 'Health',
        description: 'Endpoint per il controllo dello stato del servizio'
      }
    ]
  },
  apis: [
    './src/services/user-service/routes/*.ts',
    './src/services/user-service/index.ts'
  ]
};

export const specs = swaggerJsdoc(options);