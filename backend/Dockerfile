# ===== STAGE 1: BUILD =====
FROM node:24-bookworm AS builder

WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./
COPY tsconfig.json ./

# Installa TUTTE le dipendenze (incluse devDependencies per la build)
RUN npm install

# Copia il codice sorgente
COPY src ./src

# Compila il progetto TypeScript
RUN npm run build

# ===== STAGE 2: PRODUCTION =====
FROM node:24-bookworm

# Installazione Oracle Instant Client
RUN apt-get update && apt-get install -y libaio1 wget unzip
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-basic-linux.x64-23.9.0.25.07.zip
RUN unzip instantclient-basic-linux.x64-23.9.0.25.07.zip -d /opt/oracle && \
    rm instantclient-basic-linux.x64-23.9.0.25.07.zip && \
    ln -s /opt/oracle/instantclient_23_9 /opt/oracle/instantclient && \
    sh -c "echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf" && \
    ldconfig

COPY wallet/* /opt/oracle/instantclient/network/admin/

WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa SOLO le dipendenze di produzione
RUN npm install --omit=dev

# Copia i file compilati dallo stage di build
COPY --from=builder /app/dist ./dist

EXPOSE ${PORT}

CMD npm run start:${SERVICE}