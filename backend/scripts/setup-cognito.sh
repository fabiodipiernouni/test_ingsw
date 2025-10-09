# Create User Pool
aws cognito-idp create-user-pool --pool-name "dietiestates25" --region eu-central-1 --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" --username-attributes email --auto-verified-attributes email


# Create App Client
aws cognito-idp create-user-pool-client --user-pool-id YOUR_USER_POOL_ID --client-name "dietiestates25-backend" --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH --token-validity-units "AccessToken=hours,IdToken=hours,RefreshToken=days" --access-token-validity 1 --id-token-validity 1 --refresh-token-validity 30


# Create Groups

# Owners
aws cognito-idp create-group --user-pool-id YOUR_USER_POOL_ID --group-name "owners" --description "Agency Owners" --precedence 1

# Admins
aws cognito-idp create-group --user-pool-id YOUR_USER_POOL_ID --group-name "admins" --description "Agency Administrators" --precedence 2

# Agents
aws cognito-idp create-group --user-pool-id YOUR_USER_POOL_ID --group-name "agents" --description "Real Estate Agents" --precedence 3

# Clients
aws cognito-idp create-group --user-pool-id YOUR_USER_POOL_ID --group-name "clients" --description "Regular Clients" --precedence 4


# Create User Pool Domain
aws cognito-idp create-user-pool-domain --domain dietiestates25 --user-pool-id YOUR_USER_POOL_ID --region eu-central-1

# Verifica Domain
aws cognito-idp describe-user-pool-domain --domain dietiestates25 --region eu-central-1


# Set up Google as Identity Provider
aws cognito-idp create-identity-provider --user-pool-id YOUR_USER_POOL_ID --provider-name "Google" --provider-type "Google" --region eu-central-1 --provider-details "{\"client_id\": \"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\": \"YOUR_GOOGLE_CLIENT_SECRET\",\"authorize_scopes\": \"openid email profile\"}" --attribute-mapping '{"email": "email", "given_name": "given_name", "family_name": "family_name", "picture": "picture", "username": "sub"}'


# Update App Client to enable OAuth with Google
aws cognito-idp update-user-pool-client --user-pool-id YOUR_USER_POOL_ID --client-id YOUR_APP_CLIENT_ID --region eu-central-1 --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_USER_SRP_AUTH" --allowed-o-auth-flows "code" --allowed-o-auth-scopes "openid" "email" "profile" "aws.cognito.signin.user.admin" --allowed-o-auth-flows-user-pool-client --callback-urls "http://localhost:3001/api/oauth/callback" "YOUR_CALLBACK_URL_PROD" --logout-urls "http://localhost:4200" "YOUR_LOGOUT_URL_PROD" --supported-identity-providers "COGNITO" "Google"