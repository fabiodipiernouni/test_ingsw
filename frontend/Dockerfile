# STAGE 1: Build dell'applicazione Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copia package.json e installa dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto del codice
COPY . .

# Esegue la build di produzione
# Come da package.json
RUN npm run build -- --configuration production

# STAGE 2: Immagine di produzione con Nginx
FROM nginx:alpine

# Rimuovi la configurazione di default
RUN rm /etc/nginx/nginx.conf

# Copia la nostra configurazione Nginx per la SPA
COPY nginx.conf /etc/nginx/nginx.conf

# Copia i file statici buildati dallo stage 'build'
# Il percorso di output è 'dist/dietiestates25/browser' come da angular.json
COPY --from=build /app/dist/dietiestates25/browser /usr/share/nginx/html

# Espone la porta 80 (default di Nginx)
EXPOSE 80