import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../../../config/index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
      description: 'Servizio di autenticazione e autorizzazione - Gestisce registrazione, login, logout e gestione delle password degli utenti.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.auth.port || 3001}`,
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
        User: {
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
              example: '+39 123 456 7890'
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Indica se l\'email è stata verificata',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data di creazione dell\'account',
              example: '2025-09-28T10:30:00.000Z'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'phone', 'acceptTerms', 'acceptPrivacy'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'utente (deve essere valida e univoca)',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'Password (almeno 8 caratteri, deve contenere almeno una lettera e un numero)',
              example: 'MySecurePass123'
            },
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
              example: '+39 123 456 7890'
            },
            acceptTerms: {
              type: 'boolean',
              description: 'Accettazione dei termini di servizio',
              example: true
            },
            acceptPrivacy: {
              type: 'boolean',
              description: 'Accettazione della privacy policy',
              example: true
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'utente',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password dell\'utente',
              example: 'MySecurePass123'
            }
          }
        },
        AuthResponse: {
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
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'Token JWT per l\'accesso alle API protette',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  description: 'Token per il refresh dell\'access token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                tokenType: {
                  type: 'string',
                  example: 'Bearer'
                },
                isNewUser: {
                  type: 'boolean',
                  description: 'Presente solo nella registrazione, indica se è un nuovo utente',
                  example: true
                }
              }
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Token di refresh per ottenere un nuovo access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                tokenType: {
                  type: 'string',
                  example: 'Bearer'
                }
              }
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              description: 'Password attuale dell\'utente',
              example: 'OldPassword123'
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'Nuova password (almeno 8 caratteri, deve contenere almeno una lettera e un numero)',
              example: 'NewSecurePass123'
            }
          }
        },
        EmailVerificationRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email per cui inviare il codice di verifica',
              example: 'user@example.com'
            }
          }
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email dell\'utente',
              example: 'user@example.com'
            },
            otp: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'Codice OTP a 6 cifre',
              example: '123456'
            }
          }
        },
        TokenVerificationResponse: {
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
                  $ref: '#/components/schemas/User'
                },
                valid: {
                  type: 'boolean',
                  example: true
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
              },
              description: 'Dettagli degli errori di validazione (presente solo per errori di validazione)'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-28T10:30:00.000Z'
            },
            path: {
              type: 'string',
              description: 'Percorso dell\'endpoint che ha generato l\'errore',
              example: '/login'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'auth-service'
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
        name: 'Authentication',
        description: 'Operazioni di autenticazione (login, registrazione, logout)'
      },
      {
        name: 'Token Management',
        description: 'Gestione dei token JWT (refresh, verifica)'
      },
      {
        name: 'Password Management',
        description: 'Gestione delle password (cambio password)'
      },
      {
        name: 'Email Verification',
        description: 'Verifica dell\'indirizzo email tramite codice OTP'
      },
      {
        name: 'Health',
        description: 'Endpoint per il controllo dello stato del servizio'
      }
    ]
  },
  apis: [
    './src/services/auth-service/routes/*.ts',
    './src/services/auth-service/index.ts'
  ]
};

export const specs = swaggerJsdoc(options);