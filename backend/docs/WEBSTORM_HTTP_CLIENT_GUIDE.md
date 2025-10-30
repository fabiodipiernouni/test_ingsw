# 🚀 Guida WebStorm - Come Usare i File .http

## 📝 Panoramica

WebStorm (e tutti gli IDE JetBrains) supportano nativamente i file `.http` per testare le API direttamente dall'IDE, senza bisogno di Postman!

---

## 🎯 Setup Iniziale (DA FARE PRIMA)

### Step 1: Configura le Variabili di Environment

Il file `test/http-client.env.json` contiene le variabili che userai nelle richieste.

**Apri il file e modifica:**

```json
{
  "dev": {
    "jwt_token": "IL_TUO_TOKEN_JWT_QUI",
    "property_id": "UUID_PROPRIETÀ_ESISTENTE",
    "base_url": "http://localhost:3001"
  }
}
```

**Come ottenere il JWT token:**
1. Fai login tramite l'API di autenticazione
2. Copia il token dalla risposta
3. Incollalo nel campo `jwt_token`

**Come ottenere un property_id:**
1. Esegui una richiesta GET alle proprietà
2. Copia l'ID di una proprietà esistente
3. Incollalo nel campo `property_id`

---

## ▶️ Come Eseguire una Richiesta

### Metodo 1: Pulsante Run (Più Facile)

1. **Apri il file** `test/property-service.http`
2. **Vedrai dei pulsanti verdi ▶️** accanto a ogni richiesta HTTP
3. **Clicca sul pulsante** per eseguire la richiesta
4. **I risultati appariranno** in una nuova tab "Run"

```
### Upload Singola Immagine              ◀── Clicca sul ▶️ qui accanto
POST {{base_url}}/api/property/...
```

### Metodo 2: Shortcut da Tastiera

1. Posiziona il cursore sulla richiesta che vuoi eseguire
2. Premi:
   - **Windows/Linux**: `Ctrl + Enter` oppure `Alt + Enter` → "Run"
   - **Mac**: `⌘ + Enter` oppure `⌥ + Enter` → "Run"

### Metodo 3: Menu Contestuale

1. Click destro sulla richiesta
2. Seleziona "Run" o "Run All Requests in File"

---

## 📤 Upload di Immagini - IMPORTANTE

⚠️ **PROBLEMA**: I file `.http` di WebStorm **NON supportano l'upload di file binari** tramite multipart/form-data nel modo standard!

### ❌ Cosa NON Funziona

Le richieste di upload nel file `.http` **NON funzioneranno** così come sono perché:
- La sintassi `< ./path/to/image.jpg` non carica effettivamente i file
- Multipart form-data richiede file reali

### ✅ Soluzioni Alternative

#### Opzione 1: Usa Postman (CONSIGLIATO per Upload)

Per l'upload di immagini, **usa la collection Postman** che ho preparato:
- File: `docs/DietiEstates_PropertyImages.postman_collection.json`
- Importala in Postman
- Funzionerà perfettamente con upload di file reali

#### Opzione 2: Usa cURL dal Terminale

WebStorm può generare il comando cURL:
1. Click destro sulla richiesta
2. "Copy as cURL"
3. Incolla nel terminale e modifica i path dei file

Esempio:
```bash
curl -X POST "http://localhost:3001/api/property/UUID/images" \
  -H "Authorization: Bearer TOKEN" \
  -F "images=@C:/path/to/image1.jpg" \
  -F "images=@C:/path/to/image2.jpg" \
  -F 'metadata=[{"isPrimary":true,"order":0}]'
```

#### Opzione 3: Plugin HTTP Client (Avanzato)

WebStorm permette di usare script JavaScript per generare richieste dinamiche:
- Crea un file `.js` nella cartella `test`
- Usa l'API `client.execute()` per fare richieste con file

---

## 🧪 Quali Richieste Usare nel File .http

### ✅ FUNZIONANO BENE:

Queste richieste puoi eseguirle direttamente da WebStorm:

#### 1. Creazione Proprietà (POST)
```http
### Creazione Proprietà
POST {{base_url}}/api/properties
Content-Type: application/json
Authorization: Bearer {{jwt_token}}

{
  "title": "Appartamento...",
  ...
}
```

#### 2. Lista Proprietà (GET)
```http
### Ottenere Lista Proprietà
GET {{base_url}}/api/properties/
```

#### 3. Dettagli Proprietà (GET)
```http
### Ottenere Dettagli
GET {{base_url}}/api/properties/{{property_id}}
```

### ⚠️ NON FUNZIONANO (richiedono file reali):

- ❌ Tutte le richieste di **upload immagini**
- Usa Postman per queste!

---

## 🎨 Funzionalità Avanzate WebStorm

### Selezionare l'Environment

In alto a destra nella finestra "Run", puoi selezionare:
- `dev` - Ambiente di sviluppo
- `local` - Ambiente locale
- Aggiungi altri ambienti in `http-client.env.json`

### Variabili Dinamiche

Puoi usare variabili generate automaticamente:
```http
### Timestamp dinamico
POST {{base_url}}/api/properties
Content-Type: application/json

{
  "timestamp": "{{$timestamp}}",
  "uuid": "{{$uuid}}"
}
```

Variabili disponibili:
- `{{$uuid}}` - UUID casuale
- `{{$timestamp}}` - Timestamp Unix corrente
- `{{$randomInt}}` - Numero casuale

### Salvare Variabili dalla Risposta

Puoi salvare valori dalla risposta in variabili:

```http
### Login
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password"
}

> {%
  client.global.set("jwt_token", response.body.token);
%}

### Usa il token salvato
GET {{base_url}}/api/properties
Authorization: Bearer {{jwt_token}}
```

---

## 📊 Leggere i Risultati

Dopo aver eseguito una richiesta, vedrai:

### Tab "Response"
- **Body**: Il corpo della risposta (JSON, HTML, ecc.)
- **Headers**: Gli header della risposta
- **Console**: Log ed errori

### Formato JSON Automatico
- JSON viene formattato automaticamente
- Puoi copiare, cercare, navigare nel JSON

### Codici di Stato
- ✅ 200-299: Successo (verde)
- ⚠️ 400-499: Errore client (giallo)
- ❌ 500-599: Errore server (rosso)

---

## 🔧 Tips & Tricks

### 1. Commenti
```http
### Questo è un commento
# Anche questo è un commento
// E anche questo
```

### 2. Separare le Richieste
Usa `###` per separare le richieste:
```http
### Prima richiesta
GET /api/endpoint1

### Seconda richiesta
GET /api/endpoint2
```

### 3. Disabilitare una Richiesta
Aggiungi `#` davanti:
```http
### Richiesta disabilitata
# POST {{base_url}}/api/endpoint
```

### 4. Eseguire Tutte le Richieste
- Click destro nel file
- "Run All Requests in File"
- Le richieste vengono eseguite in sequenza

### 5. Organizzare i File
Crea file separati per servizi diversi:
```
test/
  ├── auth-service.http
  ├── property-service.http
  ├── user-service.http
  └── http-client.env.json
```

---

## 📋 Checklist Pre-Test

Prima di eseguire le richieste:

- [ ] Backend è in esecuzione (`npm run dev`)
- [ ] Database PostgreSQL è attivo
- [ ] File `http-client.env.json` è configurato
- [ ] `jwt_token` è valido (non scaduto)
- [ ] `property_id` esiste nel database
- [ ] `base_url` punta al server corretto

---

## 🆘 Troubleshooting

### Errore: "Cannot resolve variable 'jwt_token'"
✅ Assicurati che `http-client.env.json` sia nella stessa cartella del file `.http`

### Errore: 401 Unauthorized
✅ Il token JWT è scaduto, fai login di nuovo e aggiorna `jwt_token`

### Errore: 404 Not Found
✅ Verifica che il `base_url` sia corretto
✅ Controlla che l'endpoint esista

### Le variabili {{...}} non vengono sostituite
✅ Usa la sintassi corretta: `{{variable}}` (doppie graffe)
✅ Verifica che la variabile esista in `http-client.env.json`

### Non vedo i pulsanti ▶️
✅ Il file deve avere estensione `.http` o `.rest`
✅ Assicurati che il plugin "HTTP Client" sia abilitato in WebStorm

---

## 🎓 Risorse Aggiuntive

### Documentazione Ufficiale JetBrains
- [HTTP Client Guide](https://www.jetbrains.com/help/webstorm/http-client-in-product-code-editor.html)
- [HTTP Request Syntax](https://www.jetbrains.com/help/webstorm/exploring-http-syntax.html)

### Esempi Avanzati
Vedi la cartella `test/` per esempi completi di:
- Autenticazione
- CRUD operations
- Gestione errori
- Variabili dinamiche

---

## ✅ Riepilogo

**Usa File .http per:**
- ✅ GET requests (liste, dettagli)
- ✅ POST/PUT/DELETE con JSON
- ✅ Test rapidi durante sviluppo
- ✅ Documentazione delle API

**Usa Postman per:**
- ✅ Upload di file (multipart/form-data)
- ✅ Test complessi con file
- ✅ Condivisione con il team

**Entrambi sono validi e complementari!** 🚀

