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