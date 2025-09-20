import dotenv from 'dotenv';
import path from 'path';

// Carica variabili d'ambiente
dotenv.config();

// Avvia il servizio di autenticazione
import './services/auth-service/index';

console.log('🚀 DietiEstates25 Backend - Auth Service starting...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 Auth Service Port: ${process.env.AUTH_PORT || 3001}`);