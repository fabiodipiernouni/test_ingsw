        schema:
          $ref: '#/components/schemas/ValidationErrorResponse'
        examples:
          invalidMetadata: {...}
          multiplePrimary: {...}
          countMismatch: {...}
```

**Vantaggi:**
- ✅ Flusso completo documentato
- ✅ Tipizzazione esplicita
- ✅ 3 esempi di richiesta/risposta
- ✅ 3 esempi di errori diversi
- ✅ Utilizzo di schemi riutilizzabili
- ✅ Vincoli e regole di business chiari

---

## 🎯 Schemi Swagger Definiti

### ImageMetadataDto
```typescript
{
  isPrimary: boolean;     // Obbligatorio
  order: number;          // Obbligatorio (0-99, univoco)
  caption?: string;       // Opzionale (max 500 char)
  altText?: string;       // Opzionale (max 255 char)
}
```

### UploadImagesRequest
```typescript
{
  images: File[];         // 1-10 file, formato binary
  metadata: ImageMetadataDto[];  // 1-10 oggetti
}
```

### UploadImagesResponse
```typescript
{
  success: boolean;
  message: string;
  data: {
    images: PropertyImageModel[];
  };
  timestamp: string;
}
```

---

## 📖 Come Visualizzare la Documentazione

### 1. Swagger UI (Raccomandato)
```
http://localhost:3002/api-docs
```

Qui potrai:
- ✅ Vedere tutta la documentazione formattata
- ✅ Provare le API direttamente dall'interfaccia
- ✅ Vedere gli schemi con validazioni
- ✅ Testare con esempi pre-compilati

### 2. JSON Schema
```
http://localhost:3002/api-docs.json
```

Schema OpenAPI 3.0 completo in formato JSON.

---

## 🎨 Esempi nella Documentazione

### Esempio 1: Upload Singola Immagine
```json
{
  "images": ["[binary file]"],
  "metadata": [
    {
      "isPrimary": true,
      "order": 0,
      "caption": "Soggiorno luminoso",
      "altText": "Vista del soggiorno"
    }
  ]
}
```

### Esempio 2: Upload Multiple Immagini
```json
{
  "images": ["[binary file 1]", "[binary file 2]"],
  "metadata": [
    {
      "isPrimary": true,
      "order": 0,
      "caption": "Soggiorno"
    },
    {
      "isPrimary": false,
      "order": 1,
      "caption": "Cucina"
    }
  ]
}
```

### Esempio 3: Errore - Metadata Non Validi
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "metadata[0].isPrimary: isPrimary must be a boolean",
    "metadata[1].order: order must not exceed 99"
  ]
}
```

### Esempio 4: Errore - Multiple Primary
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Only one image can be marked as primary"
  ]
}
```

### Esempio 5: Errore - Count Mismatch
```json
{
  "success": false,
  "error": "Metadata count mismatch",
  "message": "Metadata count (2) must match files count (3)"
}
```

---

## 🔍 Validazioni Documentate

La documentazione Swagger ora include:

1. **Validazioni sui file:**
   - Formati supportati: JPEG, PNG, WebP
   - Dimensione max: 10MB per file
   - Risoluzione max: 10000x10000 pixel
   - Massimo 10 file

2. **Validazioni sui metadata:**
   - `isPrimary`: boolean obbligatorio
   - `order`: 0-99, univoco, obbligatorio
   - `caption`: max 500 caratteri, opzionale
   - `altText`: max 255 caratteri, opzionale

3. **Validazioni di business:**
   - Solo una immagine primary
   - Order univoco
   - Numero metadata = numero file
   - Solo l'agente proprietario può caricare

---

## 🎉 Risultato Finale

La documentazione Swagger è ora:

✅ **Completa** - Tutti i dettagli tecnici e di business
✅ **Tipizzata** - Riferimenti ai tipi TypeScript
✅ **Esemplificata** - 5 esempi pratici
✅ **Strutturata** - Utilizza schemi riutilizzabili
✅ **Testabile** - Try-it-out in Swagger UI
✅ **Manutenibile** - Single source of truth

---

## 📚 File Modificati Riepilogo

### 1. `swagger.ts`
- Aggiunto `ImageMetadataDto`
- Aggiunto `UploadImagesRequest`
- Aggiunto `UploadImagesResponse`
- Aggiunto `GetGeoPropertiesCardsRequest`
- Aggiunto `GetPropertiesByIdListRequest`

### 2. `properties.ts` (routes)
- Migliorato JSDoc dell'endpoint upload
- Aggiunto descrizione del flusso
- Aggiunto esempi multipli
- Aggiunto references agli schemi
- Aggiunto esempi di errori

### 3. `AddPropertyImageRequest.ts` (nuovo)
- Tipo per la richiesta tipizzata

### 4. `index.ts` (nuovo)
- Barrel export per i DTO

---

## 🚀 Prossimi Passi

1. **Avvia il server:**
   ```bash
   npm run dev
   ```

2. **Apri Swagger UI:**
   ```
   http://localhost:3002/api-docs
   ```

3. **Naviga all'endpoint:**
   - Cerca "POST /properties/{propertyId}/images"
   - Espandi per vedere tutta la documentazione

4. **Prova l'API:**
   - Clicca "Try it out"
   - Inserisci propertyId e JWT token
   - Carica file e metadata
   - Esegui la richiesta

Buon sviluppo! 🎉
# ✅ Aggiornamento Swagger Completato

## 📋 Modifiche Apportate

### 1. **File swagger.ts** (Già completato precedentemente)

Aggiunto gli schemi mancanti:
- ✅ `ImageMetadataDto` - Schema per i metadata di ogni immagine
- ✅ `UploadImagesRequest` - Schema per la richiesta di upload
- ✅ `UploadImagesResponse` - Schema per la risposta di upload
- ✅ `GetGeoPropertiesCardsRequest` - Schema per ricerca geografica
- ✅ `GetPropertiesByIdListRequest` - Schema per ricerca per ID

### 2. **File properties.ts (routes)** - APPENA AGGIORNATO ✅

Migliorato la documentazione Swagger dell'endpoint `/properties/{propertyId}/images`:

#### Miglioramenti:
1. **Descrizione completa del flusso di validazione**
   - Documenta tutti i 6 middleware coinvolti
   - Spiega la catena di validazione

2. **Documentazione della tipizzazione**
   - Riferimenti ai tipi TypeScript utilizzati
   - `AddPropertyImageRequest`, `PropertyImageMetadata[]`, `UploadImagesResponse`

3. **Esempi multipli**
   - Esempio singola immagine
   - Esempio multiple immagini
   - Esempi di errori comuni

4. **Responses dettagliate**
   - 201: Upload riuscito con esempio completo
   - 400: Errori di validazione con 3 esempi diversi
   - 401: Non autenticato
   - 403: Non autorizzato (proprietà non appartiene all'agente)
   - 404: Proprietà non trovata
   - 500: Errore server

5. **Utilizzo degli schemi definiti**
   - `$ref: '#/components/schemas/UploadImagesRequest'`
   - `$ref: '#/components/schemas/UploadImagesResponse'`
   - `$ref: '#/components/schemas/ValidationErrorResponse'`
   - `$ref: '#/components/schemas/ErrorResponse'`

---

## 📊 Confronto Prima/Dopo

### ❌ PRIMA: Documentazione Minimale

```yaml
summary: Upload images for a property
description: Upload one or multiple images to a property. Images are validated and uploaded to S3.
responses:
  201:
    description: Images uploaded successfully
  400:
    description: Validation error
  401:
    description: Unauthorized
  403:
    description: Forbidden
```

**Problemi:**
- ❌ Nessun dettaglio sul flusso di validazione
- ❌ Nessun esempio di richiesta/risposta
- ❌ Nessun dettaglio sugli errori
- ❌ Nessun riferimento alla tipizzazione

---

### ✅ DOPO: Documentazione Completa

```yaml
summary: Upload immagini per una proprietà
description: |
  Carica una o più immagini per una proprietà. Le immagini vengono validate e caricate su S3.
  
  **Flusso di validazione:**
  1. Autenticazione JWT (authenticateToken)
  2. Validazione permessi (validatePropertyImageUploadPermissions)
  3. Upload file in memoria con Multer (max 10 file, 10MB ciascuno)
  4. Validazione formato e dimensioni immagini (validateImageFiles)
  5. Validazione metadata tipizzati (validatePropertyImageMetadata)
  6. Upload S3 e salvataggio DB
  
  **Tipizzazione:**
  - Request: AddPropertyImageRequest (extends AuthenticatedRequest)
  - Metadata: PropertyImageMetadata[] (validato con class-validator)
  - Response: UploadImagesResponse
  
  **Vincoli:**
  - Solo l'agente proprietario della proprietà può caricare immagini
  - Numero di metadata deve corrispondere al numero di file
  - Solo una immagine può essere primary
  - Ogni order deve essere univoco

requestBody:
  content:
    multipart/form-data:
      schema:
        $ref: '#/components/schemas/UploadImagesRequest'
      examples:
        singleImage: {...}
        multipleImages: {...}

responses:
  201:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/UploadImagesResponse'
        example: {...esempio completo...}
  400:
    content:
      application/json:

