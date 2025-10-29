#!/usr/bin/env node

/**
 * Script per creare una nuova agenzia immobiliare con utente owner
 * 
 * Questo script:
 * 1. Chiede i dati dell'agenzia
 * 2. Crea l'owner in AWS Cognito (con email automatica)
 * 3. Crea l'agenzia nel database
 * 4. Crea il record utente locale con cognitoSub
 * 5. Associa l'owner all'agenzia creata
 */

import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../src/shared/database';
import { User, Agency } from '../src/shared/database/models';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import config from '../src/shared/config';
import logger from '../src/shared/utils/logger';

// Cognito Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Configurazione readline per input utente
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funzione helper per fare domande
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Funzione per validare email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Funzione principale
async function createAgencyAndAdmin() {
  logger.info('Script di creazione nuova agenzia immobiliare\n');
  logger.info('=' .repeat(50));

  try {
    // Inizializza database
    await database.connect();
    logger.info('Connessione al database riuscita\n');

    // Raccolta dati agenzia
    logger.info('DATI AGENZIA');
    logger.info('-'.repeat(20));

    const agencyName = await askQuestion('Nome agenzia (obbligatorio): ');
    if (!agencyName) {
      throw new Error('Il nome dell\'agenzia è obbligatorio');
    }

    // Verifica che l'agenzia non esista già
    const existingAgency = await Agency.findOne({ where: { name: agencyName } });
    if (existingAgency) {
      throw new Error(`L'agenzia "${agencyName}" esiste già`);
    }

    const description = await askQuestion('Descrizione (opzionale): ');
    const street = await askQuestion('Indirizzo via e numero (opzionale): '); //TODO: potremmo integrare un servizio di geocoding per validare l'indirizzo
    let city, province, zipCode, country;
    if (street) {
      city = await askQuestion('Città: ');
      if(!city) {
        throw new Error('La città è obbligatoria');
      }
      province = await askQuestion('Provincia: ');
      if(!province) {
        throw new Error('La provincia è obbligatoria');
      }
      zipCode = await askQuestion('CAP: ');
      if(!zipCode) {
        throw new Error('Il CAP è obbligatorio');
      }
      country = await askQuestion('Paese (opzionale, default: Italia): ');
    } else {
      city = null;
      province = null;
      zipCode = null;
      country = null;
    }
    const phone = await askQuestion('Telefono (opzionale): ');
    const email = await askQuestion('Email agenzia (opzionale): ');
    // Validazione email se fornita
    if (email && !isValidEmail(email)) {
      throw new Error('Email non valida');
    }

    const website = await askQuestion('Sito web (opzionale): ');
    const licenseNumber = await askQuestion('Numero licenza (opzionale): ');

    logger.info('\nDATI UTENTE ADMIN');
    logger.info('-'.repeat(20));

    const adminEmail = await askQuestion('Email utente admin (obbligatorio): ');
    if (!adminEmail || !isValidEmail(adminEmail)) {
      throw new Error('Email admin non valida');
    }

    // Verifica che l'utente non esista già
    const existingUser = await User.findOne({ where: { email: adminEmail } });
    if (existingUser) {
      throw new Error(`Un utente con email "${adminEmail}" esiste già`);
    }

    const firstName = await askQuestion('Nome (obbligatorio): ');
    if (!firstName) {
      throw new Error('Il nome è obbligatorio');
    }

    const lastName = await askQuestion('Cognome (obbligatorio): ');
    if (!lastName) {
      throw new Error('Il cognome è obbligatorio');
    }

    const ownerPhone = await askQuestion('Telefono owner (opzionale): ');
    
    logger.info('\n🔧 RIEPILOGO');
    logger.info('-'.repeat(20));
    logger.info(`Agenzia: ${agencyName}`);
    logger.info(`Owner: ${firstName} ${lastName} (${adminEmail})`);
    logger.info('\nL\'owner sarà creato in Cognito e riceverà una email con le credenziali temporanee');

    const confirm = await askQuestion('\nConfermi la creazione? (s/N): ');
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      logger.info('Operazione annullata');
      process.exit(0);
    }

    logger.info('\nCreazione in corso...');

    // 1. Crea l'owner in Cognito
    logger.info('Creazione owner in Cognito...');
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: adminEmail,
      UserAttributes: [
        { Name: 'email', Value: adminEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        ...(ownerPhone ? [{ Name: 'phone_number', Value: ownerPhone }] : [])
      ],
      DesiredDeliveryMediums: ['EMAIL'] // Cognito invia email automaticamente
    });

    const cognitoResponse = await cognitoClient.send(createUserCommand);
    const cognitoSub = cognitoResponse.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

    if (!cognitoSub) {
      throw new Error('Failed to create owner in Cognito');
    }

    logger.info('Owner creato in Cognito:', cognitoSub);

    // 2. Aggiungi al gruppo 'owners'
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: adminEmail,
      GroupName: config.cognito.groups.owners
    });

    await cognitoClient.send(addToGroupCommand);
    logger.info('Owner aggiunto al gruppo owners');

    // Inizio transazione DB
    const transaction = await database.getInstance().transaction();

    try {
      // 3. Crea il record utente locale
      const ownerUser = await User.create({
        id: uuidv4(),
        email: adminEmail,
        cognitoSub: cognitoSub,
        firstName: firstName,
        lastName: lastName,
        role: 'owner',
        phone: ownerPhone || null,
        isVerified: true, // Verificato tramite Cognito
        isActive: true,
        agencyId: null, // sarà aggiornato dopo
        linkedProviders: [],
        acceptedPrivacyAt: new Date(),
        acceptedTermsAt: new Date(),
        enabledNotificationTypes: []
      }, { transaction });

      logger.info('Record utente owner creato nel DB');

      // 4. Crea l'agenzia con createdBy = ownerUser.id
      const agency = await Agency.create({
        id: uuidv4(),
        name: agencyName,
        description: description || null,
        street: street || null,
        city: city || null,
        province: province || null,
        zipCode: zipCode || null,
        country: country || 'Italy',
        phone: phone || null,
        email: email || null,
        website: website || null,
        licenseNumber: licenseNumber || null,
        isActive: true,
        createdBy: ownerUser.id
      }, { transaction });

      logger.info('Agenzia creata');

      // 5. Aggiorna l'utente owner con agencyId
      await ownerUser.update({
        agencyId: agency.id
      }, { transaction });

      logger.info('Associazione owner-agenzia completata');

      // Commit transazione
      await transaction.commit();

      logger.info('\nCREAZIONE COMPLETATA!');
      logger.info('=' .repeat(50));
      logger.info(`Agenzia "${agencyName}" creata con ID: ${agency.id}`);
      logger.info(`Owner "${firstName} ${lastName}" creato con ID: ${ownerUser.id}`);
      logger.info(`Email: ${adminEmail}`);
      logger.info(`Cognito Sub: ${cognitoSub}`);
      logger.info('\nIMPORTANTE:');
      logger.info('   - L\'owner è stato creato in AWS Cognito');
      logger.info('   - Una email con le credenziali temporanee è stata inviata a: ' + adminEmail);
      logger.info('   - Al primo accesso sarà richiesto di cambiare la password');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error('\nERRORE:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Gestione segnali di interruzione
process.on('SIGINT', () => {
  logger.info('\n\nOperazione interrotta dall\'utente');
  rl.close();
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('\n\nOperazione terminata');
  rl.close();
  process.exit(1);
});

// Avvia lo script
if (require.main === module) {
  createAgencyAndAdmin().catch((error) => {
    logger.error('Errore fatale:', error);
    process.exit(1);
  });
}