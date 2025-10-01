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