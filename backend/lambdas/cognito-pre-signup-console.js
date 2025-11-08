import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

export const handler = async (event) => {
  console.log('Pre-Signup Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, userName, triggerSource, request } = event;
    const email = request.userAttributes.email;

    // Controlla se è una registrazione OAuth (Google, Facebook, etc.)
    const isOAuthSignup = triggerSource.includes('ExternalProvider');

    console.log(`Trigger: ${triggerSource}, isOAuth: ${isOAuthSignup}, email: ${email}`);

    if (!isOAuthSignup) {
      // Registrazione normale (email/password) - lascia passare
      console.log('Standard email/password signup - allowing normally');
      return event;
    }

    // ============================================
    // GESTIONE OAUTH SIGNUP (Google, etc.)
    // ============================================

    // 1. Cerca se esiste già un utente con questa email
    const existingUser = await findUserByEmail(userPoolId, email);

    if (!existingUser) {
      // Nessun utente esistente - crea normalmente
      console.log('No existing user found - creating new OAuth user');
      
      // Auto-conferma l'utente OAuth
      event.response.autoConfirmUser = true;
      event.response.autoVerifyEmail = true;
      
      return event;
    }

    // 2. ACCOUNT LINKING: Esiste già un utente
    console.log(`Found existing user: ${existingUser.Username}`);

    // Determina il provider OAuth
    const providerName = extractProviderName(userName);

    if (providerName) {
      try {
        // 3. Collega l'identità OAuth all'utente esistente
        await linkOAuthIdentity(
          userPoolId,
          existingUser.Username,
          userName,
          providerName
        );

        console.log(`✓ Linked ${providerName} to existing user ${existingUser.Username}`);
      } catch (linkError) {
        console.error('Error linking OAuth identity:', linkError);
        throw linkError;
      }
    }

    // Auto-conferma l'utente
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;

    return event;

  } catch (error) {
    console.error('Error in Pre-Signup Lambda:', error);
    
    throw error; // Blocca la registrazione in caso di errore critico
  }
};

/**
 * Cerca un utente esistente per email
 */
async function findUserByEmail(userPoolId, email) {
  try {
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 1
    });

    const response = await cognitoClient.send(command);

    if (response.Users && response.Users.length > 0) {
      return response.Users[0];
    }

    return null;
  } catch (error) {
    console.error('Error searching for user by email:', error);
    throw error;
  }
}

/**
 * Collega un'identità OAuth a un utente esistente
 */
async function linkOAuthIdentity(
  userPoolId,
  existingUsername,
  newOAuthUsername,
  providerName
) {
  // Estrai il subject del provider OAuth
  // userName formato: "Google_1234567890"
  const providerSubject = newOAuthUsername.split('_')[1];

  const command = new AdminLinkProviderForUserCommand({
    UserPoolId: userPoolId,
    DestinationUser: {
      ProviderName: 'Cognito',
      ProviderAttributeValue: existingUsername
    },
    SourceUser: {
      ProviderName: providerName,
      ProviderAttributeName: 'Cognito_Subject',
      ProviderAttributeValue: providerSubject
    }
  });

  await cognitoClient.send(command);
}

/**
 * Estrae il nome del provider dal username OAuth
 * Es. "Google_1234567890" -> "Google"
 */
function extractProviderName(userName) {
  if (userName.includes('_')) {
    const providerName = userName.split('_')[0];
    return providerName.charAt(0).toUpperCase() + providerName.slice(1).toLowerCase();
  }
  return null;
}
