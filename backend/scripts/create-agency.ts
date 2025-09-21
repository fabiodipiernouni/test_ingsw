#!/usr/bin/env node

/**
 * Script per creare una nuova agenzia immobiliare con utente admin
 * 
 * Questo script:
 * 1. Chiede i dati dell'agenzia
 * 2. Crea l'agenzia nel database
 * 3. Crea un utente admin con credenziali predefinite
 * 4. Associa l'utente all'agenzia creata
 * 5. Imposta il flag shouldChangePassword a true
 */

import readline from 'readline';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../src/shared/database';
import { User, Agency } from '../src/shared/database/models';

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

function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Funzione principale
async function createAgencyAndAdmin() {
  console.log('Script di creazione nuova agenzia immobiliare\n');
  console.log('=' .repeat(50));
  
  try {
    // Inizializza database
    await database.connect();
    console.log('Connessione al database riuscita\n');

    // Raccolta dati agenzia
    console.log('DATI AGENZIA');
    console.log('-'.repeat(20));
    
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
    const address = await askQuestion('Indirizzo (opzionale): ');
    const city = await askQuestion('Città (opzionale): ');
    const postalCode = await askQuestion('CAP (opzionale): ');
    const country = await askQuestion('Paese (opzionale): ');
    const phone = await askQuestion('Telefono (opzionale): ');
    const email = await askQuestion('Email agenzia (opzionale): ');
    const website = await askQuestion('Sito web (opzionale): ');
    const licenseNumber = await askQuestion('Numero licenza (opzionale): ');

    // Validazione email se fornita
    if (email && !isValidEmail(email)) {
      throw new Error('Email non valida');
    }

    console.log('\nDATI UTENTE ADMIN');
    console.log('-'.repeat(20));
    
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

    const adminPhone = await askQuestion('Telefono admin (opzionale): ');

    // Credenziali predefinite
    const randomPassword = generateRandomPassword(12);
    
    console.log('\n🔧 RIEPILOGO');
    console.log('-'.repeat(20));
    console.log(`Agenzia: ${agencyName}`);
    console.log(`Admin: ${firstName} ${lastName} (${adminEmail})`);
    console.log(`Password temporanea: ${randomPassword}`);
    console.log('\nL\'utente admin sarà creato con credenziali predefinite');
    
    const confirm = await askQuestion('\nConfermi la creazione? (s/N): ');
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      console.log('Operazione annullata');
      process.exit(0);
    }

    console.log('\nCreazione in corso...');

    // Inizio transazione
    const transaction = await database.getInstance().transaction();

    try {
      // 1. Crea l'utente admin (senza agencyId)

      const adminUser = await User.create({
        id: uuidv4(),
        email: adminEmail,
        password: randomPassword,
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        phone: adminPhone || null,
        isVerified: false,
        isActive: true,
        shouldChangePassword: true,
        agencyId: null, // sarà aggiornato dopo
        linkedProviders: [],
        reviewsCount: 0,
        acceptedPrivacyAt: new Date(),
        acceptedTermsAt: new Date()
      }, { transaction });

      console.log('Utente admin creato');

      // 2. Crea l'agenzia con createdBy = adminUser.id
      const agency = await Agency.create({
        id: uuidv4(),
        name: agencyName,
        description: description || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        licenseNumber: licenseNumber || null,
        isActive: true,
        createdBy: adminUser.id
      }, { transaction });

      console.log('Agenzia creata');

      // 3. Aggiorna l'utente admin con agencyId
      await adminUser.update({
        agencyId: agency.id
      }, { transaction });

      console.log('Associazione admin-agenzia completata');

      // Commit transazione
      await transaction.commit();

      console.log('\nCREAZIONE COMPLETATA!');
      console.log('=' .repeat(50));
      console.log(`Agenzia "${agencyName}" creata con ID: ${agency.id}`);
      console.log(`Admin "${firstName} ${lastName}" creato con ID: ${adminUser.id}`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password temporanea: ${randomPassword}`);
      console.log('\nIMPORTANTE:');
      console.log('   - L\'utente è stato creato con credenziali predefinite');
      console.log('   - Sarà consigliato di cambiare la password nella pagina di onboarding');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\nERRORE:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Gestione segnali di interruzione
process.on('SIGINT', () => {
  console.log('\n\nOperazione interrotta dall\'utente');
  rl.close();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\nOperazione terminata');
  rl.close();
  process.exit(1);
});

// Avvia lo script
if (require.main === module) {
  createAgencyAndAdmin().catch((error) => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });
}