# Come Testare l'Upload di Immagini con Postman

## 🚀 Setup Iniziale

### 1. Ottieni un Token JWT
Prima di tutto devi autenticarti e ottenere un token JWT.

**Endpoint Login:**
```
POST http://localhost:3001/api/auth/login
```

**Body (JSON):**
```json
{
  "email": "agent@example.com",
  "password": "your_password"
}
```

**Risposta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Copia il token** dalla risposta.

### 2. Ottieni un Property ID
Devi avere l'ID di una proprietà che appartiene al tuo account agente.

**Endpoint:**
```
GET http://localhost:3002/api/properties/cards
Authorization: Bearer YOUR_TOKEN
```

Copia l'`id` di una proprietà dalla risposta.

## 📸 Upload Immagini - Passo per Passo

### Step 1: Crea una Nuova Request in Postman

1. Clicca su **"New"** → **"HTTP Request"**
2. Metodo: **POST**
3. URL: `http://localhost:3002/api/properties/YOUR_PROPERTY_ID/images`
   - Sostituisci `YOUR_PROPERTY_ID` con l'ID copiato

### Step 2: Imposta l'Header di Autenticazione

1. Vai al tab **"Headers"**
2. Aggiungi:
   - Key: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN`
   - ✅ Assicurati che sia spuntato

### Step 3: Configura il Body (Form-Data)

1. Vai al tab **"Body"**
2. Seleziona **"form-data"**

### Step 4: Aggiungi le Immagini

**Per ogni immagine:**
1. Clicca su "Add new field"
2. Key: `images` (scrivi esattamente così)
3. Hover sul campo Key → seleziona **"File"** dal dropdown a destra
4. Value: Clicca su **"Select Files"** e scegli l'immagine dal tuo PC
5. Ripeti per aggiungere più immagini (max 10)

**Screenshot concettuale:**
```
┌──────────┬──────┬────────────────────┐
│ KEY      │ TYPE │ VALUE              │
├──────────┼──────┼────────────────────┤
│ images   │ File │ [soggiorno.jpg]    │
│ images   │ File │ [cucina.jpg]       │
│ images   │ File │ [bagno.jpg]        │
└──────────┴──────┴────────────────────┘
```

### Step 5: Aggiungi i Metadata

1. Aggiungi un nuovo campo
2. Key: `metadata` (esattamente così)
3. Type: **"Text"** (default)
4. Value: Incolla questo JSON array:

```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Soggiorno luminoso con vista panoramica",
    "altText": "Vista del soggiorno principale"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Cucina moderna completamente attrezzata",
    "altText": "Cucina con elettrodomestici"
  },
  {
    "isPrimary": false,
    "order": 2,
    "caption": "Bagno principale con vasca",
    "altText": "Bagno con vasca idromassaggio"
  }
]
```

**⚠️ IMPORTANTE:**
- Il numero di oggetti nell'array metadata **DEVE** essere uguale al numero di file caricati
- Solo **UNA** immagine può avere `"isPrimary": true`
- Ogni `order` deve essere **univoco**

### Step 6: Invia la Request

Clicca su **"Send"**

## ✅ Risposta di Successo (201 Created)

```json
{
  "success": true,
  "message": "Successfully uploaded 3 image(s)",
  "data": {
    "images": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "fileName": "123e4567-e89b-12d3-a456-426614174000.jpg",
        "contentType": "image/jpeg",
        "fileSize": 245678,
        "width": 1920,
        "height": 1080,
        "caption": "Soggiorno luminoso con vista panoramica",
        "altText": "Vista del soggiorno principale",
        "isPrimary": true,
        "order": 0,
        "urls": {
          "original": "https://s3.amazonaws.com/.../original.jpg",
          "small": "https://s3.amazonaws.com/.../small_300x300.jpg",
          "medium": "https://s3.amazonaws.com/.../medium_800x800.jpg",
          "large": "https://s3.amazonaws.com/.../large_1200x1200.jpg"
        },
        "uploadDate": "2025-11-02T10:30:00.000Z"
      },
      // ... altre immagini
    ]
  },
  "timestamp": "2025-11-02T10:30:00.000Z"
}
```

## ❌ Errori Comuni e Soluzioni

### 1. 401 Unauthorized
**Errore:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "No token provided"
}
```

**Soluzione:**
- Verifica di aver inserito il token nell'header Authorization
- Formato: `Bearer YOUR_TOKEN` (con lo spazio dopo "Bearer")

### 2. 403 Forbidden
**Errore:**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "You do not have permission to add images to this property"
}
```

**Soluzione:**
- La proprietà non appartiene al tuo account
- Usa una proprietà creata dal tuo agente

### 3. Metadata Count Mismatch
**Errore:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Metadata count mismatch",
  "details": ["Metadata count (2) must match files count (3)"]
}
```

**Soluzione:**
- Assicurati che il numero di oggetti nell'array metadata corrisponda al numero di file

### 4. Multiple Primary Images
**Errore:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": ["Only one image can be marked as primary"]
}
```

**Soluzione:**
- Solo una immagine deve avere `"isPrimary": true`
- Tutte le altre devono avere `"isPrimary": false`

### 5. Duplicate Orders
**Errore:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": ["Each image must have a unique order value"]
}
```

**Soluzione:**
- Ogni immagine deve avere un valore `order` diverso
- Usa: 0, 1, 2, 3, ... (progressivo)

### 6. Invalid File Type
**Errore:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": ["Invalid file type. Only JPEG, PNG, and WebP are allowed."]
}
```

**Soluzione:**
- Usa solo file con estensioni: `.jpg`, `.jpeg`, `.png`, `.webp`

### 7. File Too Large
**Errore:**
```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "File too large. Maximum size is 10MB"
}
```

**Soluzione:**
- Riduci la dimensione del file sotto i 10 MB
- Usa strumenti di compressione immagini online

## 📝 Esempi Pratici

### Esempio 1: Upload Singola Immagine (Primary)
```json
// metadata
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Vista principale dell'immobile"
  }
]
```

### Esempio 2: Upload 3 Immagini con Metadata Completi
```json
// metadata
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Facciata esterna dell'edificio",
    "altText": "Vista frontale del palazzo"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Soggiorno",
    "altText": "Ampio soggiorno con camino"
  },
  {
    "isPrimary": false,
    "order": 2,
    "caption": "Balcone panoramico",
    "altText": "Balcone con vista città"
  }
]
```

### Esempio 3: Upload con Metadata Minimali
```json
// metadata
[
  {
    "isPrimary": true,
    "order": 0
  },
  {
    "isPrimary": false,
    "order": 1
  }
]
```

## 💡 Suggerimenti

### Best Practices
1. **Ordina le immagini logicamente**: 
   - 0: Facciata/Vista principale
   - 1-3: Soggiorno, cucina, camere
   - 4-5: Bagni
   - 6+: Dettagli, esterni

2. **Usa caption descrittive** per migliorare la UX

3. **Inserisci altText** per accessibilità

4. **Prima immagine sempre primary** - sarà la foto di copertina

### Ottimizzazione File
- Risoluzione consigliata: 1920x1080 o 1600x1200
- Formato consigliato: JPEG (miglior rapporto qualità/dimensione)
- Usa qualità 85-90% per JPEG

## 🔧 Troubleshooting

### Il campo "images" non viene riconosciuto?
- Assicurati di aver selezionato **"File"** come tipo nel dropdown accanto al campo
- Scrivi esattamente `images` (minuscolo, plurale)

### Il JSON nel campo metadata dà errore?
- Verifica che sia un JSON valido (usa jsonlint.com)
- Non dimenticare le virgole tra gli oggetti
- Usa le virgolette doppie `"` non singole `'`

### Postman dice "Network Error"?
- Verifica che il server sia avviato (`npm run dev`)
- Controlla che l'URL sia corretto (porta 3002 per property-service)

## 📚 Risorse Aggiuntive

- **Documentazione API completa**: `docs/UPLOAD_IMAGES_API_SUMMARY.md`
- **Swagger UI**: http://localhost:3002/api-docs (quando il server è avviato)
- **Test con WebStorm**: `test/property-service.http`

---

**Buon testing! 🎉**

