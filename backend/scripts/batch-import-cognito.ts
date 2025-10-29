#!/usr/bin/env node

/**
 * Script per importare utenti in batch su AWS Cognito
 * Legge users-to-import.json e crea un file con i dati Cognito
 */

import fs from 'fs';
import path from 'path';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  MessageActionType
} from '@aws-sdk/client-cognito-identity-provider';
import config from '../src/shared/config';

// Cognito Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
});

interface UserToImport {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  agency_id: string;
  is_verified: string;
  is_active: string;
}

interface CognitoUserResult {
  ID: string;
  EMAIL: string;
  COGNITO_SUB: string;
  COGNITO_USERNAME: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  ROLE: string;
  AVATAR: string | null;
  PHONE: string;
  IS_VERIFIED: string;
  IS_ACTIVE: string;
  LINKED_PROVIDERS: string | null;
  LAST_LOGIN_AT: string | null;
  ACCEPTED_TERMS_AT: string | null;
  ACCEPTED_PRIVACY_AT: string | null;
  AGENCY_ID: string;
  LICENSE_NUMBER: string | null;
  BIOGRAPHY: string | null;
  SPECIALIZATIONS: string | null;
  CREATED_AT: string;
  UPDATED_AT: string;
  success?: boolean;
  error?: string;
}

function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getGroupNameFromRole(role: string): string {
  const roleMap: { [key: string]: string } = {
    client: config.cognito.groups.clients,
    agent: config.cognito.groups.agents,
    admin: config.cognito.groups.admins,
    owner: config.cognito.groups.owners
  };
  return roleMap[role.toLowerCase()] || config.cognito.groups.clients;
}

async function createCognitoUser(user: UserToImport): Promise<CognitoUserResult> {
  const currentDate = new Date().toISOString();
  
  const result: CognitoUserResult = {
    ID: user.id,
    EMAIL: user.email,
    COGNITO_SUB: '',
    COGNITO_USERNAME: '',
    FIRST_NAME: user.first_name,
    LAST_NAME: user.last_name,
    ROLE: user.role,
    AVATAR: null,
    PHONE: user.phone,
    IS_VERIFIED: user.is_verified,
    IS_ACTIVE: user.is_active,
    LINKED_PROVIDERS: null,
    LAST_LOGIN_AT: null,
    ACCEPTED_TERMS_AT: null,
    ACCEPTED_PRIVACY_AT: null,
    AGENCY_ID: user.agency_id,
    LICENSE_NUMBER: null,
    BIOGRAPHY: null,
    SPECIALIZATIONS: null,
    CREATED_AT: currentDate,
    UPDATED_AT: currentDate,
    success: false
  };

  try {
    
    // Crea l'utente in Cognito
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: user.email,
      UserAttributes: [
        { Name: 'email', Value: user.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: user.first_name },
        { Name: 'family_name', Value: user.last_name },
        { Name: 'phone_number', Value: user.phone }
      ],
      MessageAction: MessageActionType.SUPPRESS,
      DesiredDeliveryMediums: []
    });

    const createResponse = await cognitoClient.send(createCommand);
    const cognitoSub = createResponse.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

    if (!cognitoSub) {
      throw new Error('Impossibile ottenere cognitoSub');
    }

    result.COGNITO_SUB = cognitoSub;
    result.COGNITO_USERNAME = user.email;

    // Imposta la password permanente
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: user.email,
      Password: `${ucFirst(user.email.split('@')[0])}123!`,
      Permanent: true
    });

    await cognitoClient.send(setPasswordCommand);

    // Aggiungi al gruppo
    const groupName = getGroupNameFromRole(user.role);
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: user.email,
      GroupName: groupName
    });

    await cognitoClient.send(addToGroupCommand);

    result.success = true;
    console.log(`✅ ${user.email} - ${cognitoSub}`);

  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ ${user.email}`, error);
  }

  return result;
}

async function main() {
  try {
    console.log('=== Importazione Batch Utenti su Cognito ===\n');

    // Leggi il file di input
    const inputPath = path.join(__dirname, 'users-to-import.json');
    console.log(`Lettura file: ${inputPath}\n`);

    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const users: UserToImport[] = JSON.parse(fileContent);

    console.log(`Trovati ${users.length} utenti da importare\n`);
    console.log('Inizio importazione...\n');

    const results: CognitoUserResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Processa gli utenti uno alla volta per evitare rate limiting
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`[${i + 1}/${users.length}] Processando: ${user.email}`);

      const result = await createCognitoUser(user);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Pausa di 100ms tra le richieste per evitare rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    }

    // Salva i risultati (rimuovi i campi success ed error)
    const outputPath = path.join(__dirname, 'cognito-import-results.json');
    const cleanResults = results.map(({ success, error, ...rest }) => rest);
    fs.writeFileSync(outputPath, JSON.stringify(cleanResults, null, 2), 'utf-8');

    console.log('\n=== Riepilogo ===');
    console.log(`✅ Utenti importati con successo: ${successCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`📊 Totale: ${users.length}`);
    console.log(`\n📄 Risultati salvati in: ${outputPath}`);

  } catch (error: any) {
    console.error(`\n❌ Errore fatale: ${error.message}`);
    process.exit(1);
  }
}

// Avvia lo script
main();
