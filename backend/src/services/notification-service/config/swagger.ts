//TODO: ancora da implementare, potremmo usare un servizio come aws sns
//vedi il file yaml in notification-service.yaml per le idee sugli endpoint
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../../../config/index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description: 'Servizio di notifiche - Gestisce l\'invio e la ricezione di notifiche per gli utenti del sistema.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.notification.port || 3005}/api`,
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
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'notification-service'
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
        },
        Notification: {
          type: 'object',
          required: ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID univoco della notifica',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID dell\'utente destinatario della notifica',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            type: {
              type: 'string',
              enum: ['new_property_match_saved_search', 'promotional_message', 'visit_status_update'],
              description: 'Tipo di notifica',
              example: 'new_property_match_saved_search'
            },
            title: {
              type: 'string',
              description: 'Titolo della notifica',
              example: 'Nuova proprietà corrispondente alla tua ricerca'
            },
            message: {
              type: 'string',
              description: 'Messaggio della notifica',
              example: 'Abbiamo trovato un nuovo appartamento a Milano che corrisponde ai tuoi criteri di ricerca.'
            },
            isRead: {
              type: 'boolean',
              description: 'Indica se la notifica è stata letta',
              example: false
            },
            actionUrl: {
              type: 'string',
              description: 'URL opzionale per un\'azione correlata alla notifica',
              example: '/properties/123',
              nullable: true
            },
            imageUrl: {
              type: 'string',
              description: 'URL opzionale di un\'immagine associata alla notifica',
              example: 'https://example.com/image.jpg',
              nullable: true
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora in cui la notifica è stata letta',
              example: '2025-10-30T15:30:00.000Z',
              nullable: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora di creazione della notifica',
              example: '2025-10-30T10:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data e ora dell\'ultimo aggiornamento',
              example: '2025-10-30T15:30:00.000Z'
            }
          }
        },
        PagedNotificationsResult: {
          type: 'object',
          required: ['data', 'totalCount', 'currentPage', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Notification'
              },
              description: 'Array di notifiche'
            },
            totalCount: {
              type: 'integer',
              description: 'Numero totale di notifiche',
              example: 42
            },
            currentPage: {
              type: 'integer',
              description: 'Pagina corrente',
              example: 1
            },
            totalPages: {
              type: 'integer',
              description: 'Numero totale di pagine',
              example: 3
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
        },
        SuccessResponse: {
          type: 'object',
          required: ['status', 'data'],
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              example: 'success'
            },
            data: {
              type: 'object',
              description: 'Dati della risposta'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          required: ['status', 'code', 'message'],
          properties: {
            status: {
              type: 'string',
              enum: ['error'],
              example: 'error'
            },
            code: {
              type: 'string',
              description: 'Codice dell\'errore',
              example: 'UNAUTHORIZED'
            },
            message: {
              type: 'string',
              description: 'Messaggio di errore',
              example: 'User not authenticated'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Notifications',
        description: 'Gestione delle notifiche utente'
      },
      {
        name: 'Health',
        description: 'Endpoint per il controllo dello stato del servizio'
      }
    ]
  },
  apis: [
    './src/services/notification-service/routes/*.ts',
    './src/services/notification-service/index.ts'
  ]
};

export const specs = swaggerJsdoc(options);