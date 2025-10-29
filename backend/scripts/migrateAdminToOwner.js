#!/usr/bin/env node

/**
 * Script: migrateAdminToOwner.js
 * Descrizione:
 *   - Cerca utenti Cognito con email che inizia per "admin@"
 *   - Cambia l'email in "owner@"
 *   - Imposta email_verified = true
 *   - Imposta password = "Owner123!" (permanente)
 * Uso:
 *   node migrateAdminToOwner.js <USER_POOL_ID> [--dry-run]
 */

import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const [, , userPoolId, maybeDryRun] = process.argv;

if (!userPoolId) {
  console.error("❌ Devi specificare l'USER_POOL_ID come primo argomento");
  console.error("Esempio: node migrateAdminToOwner.js eu-west-1_XXXXXXXX");
  process.exit(1);
}

const DRY_RUN = maybeDryRun === "--dry-run";
const client = new CognitoIdentityProviderClient({});

async function listUsersWithAdminEmail(userPoolId) {
  let paginationToken;
  const users = [];
  do {
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: 'email ^= "admin@"',
      PaginationToken: paginationToken
    });
    const resp = await client.send(command);
    users.push(...(resp.Users || []));
    paginationToken = resp.PaginationToken;
  } while (paginationToken);
  return users;
}

function getEmail(user) {
  const attr = user.Attributes?.find(a => a.Name === "email");
  return attr ? attr.Value : null;
}

async function migrateUser(userPoolId, username, oldEmail, newEmail) {
  console.log(`\n🔄 Aggiorno ${username}: ${oldEmail} → ${newEmail}`);

  // Controlla se la nuova email esiste già
  const existing = await client.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${newEmail}"`,
    })
  );

  if (existing.Users && existing.Users.length > 0) {
    console.log(`⚠️  Skip: esiste già un utente con email ${newEmail}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`🧪 DRY RUN - nessuna modifica applicata`);
    return;
  }

  try {
    // Aggiorna email ed email_verified
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [
          { Name: "email", Value: newEmail },
          { Name: "email_verified", Value: "true" },
        ],
      })
    );
    console.log("✅ Email aggiornata e verificata");
  } catch (err) {
    console.error("❌ Errore aggiornamento email:", err.message);
    return;
  }

  try {
    // Imposta password permanente
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        Password: "Owner123!",
        Permanent: true,
      })
    );
    console.log("✅ Password impostata (Owner123!)");
  } catch (err) {
    console.error("❌ Errore impostazione password:", err.message);
  }
}

(async () => {
  console.log(`🔍 Ricerca utenti nel pool ${userPoolId}...`);
  const users = await listUsersWithAdminEmail(userPoolId);

  if (users.length === 0) {
    console.log("✅ Nessun utente con email che inizia per admin@ trovato.");
    return;
  }

  console.log(`Trovati ${users.length} utenti da elaborare.`);

  for (const user of users) {
    const email = getEmail(user);
    if (!email) {
      console.log(`⚠️  Utente ${user.Username} senza email, skip.`);
      continue;
    }

    if (!email.toLowerCase().startsWith("admin@")) continue;

    const newEmail = "owner@" + email.split("@")[1];
    console.log(`\nElaborando utente: ${user.Username} (${email} → ${newEmail})`);
    await migrateUser(userPoolId, user.Username, email, newEmail);
  }

  console.log("\n🏁 Completato!");
})();
