# 🔄 Flusso Completo Upload Immagini Proprietà

## 📍 Route Definizione

```typescript
router.post(
  '/:propertyId/images',
  authenticateToken,                          // 1️⃣ 
  validatePropertyImageUploadPermissions,     // 2️⃣
  uploadToMemory.array('images', 10),         // 3️⃣
  handleMulterError,                          // 4️⃣
  validateImageFiles,                         // 5️⃣
  validatePropertyImageMetadata,              // 6️⃣
  propertyController.addPropertyImagePost     // 7️⃣
);
```

---

## 🎯 Flusso Passo per Passo

### 📥 **REQUEST IN ARRIVO**

```http
POST /api/properties/550e8400-e29b-41d4-a716-446655440000/images
Authorization: Bearer eyJhbGciOiJ...
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="images"; filename="soggiorno.jpg"
[binary data]
--boundary
Content-Disposition: form-data; name="images"; filename="cucina.jpg"
[binary data]
--boundary
Content-Disposition: form-data; name="metadata"
[{"isPrimary":true,"order":0},{"isPrimary":false,"order":1}]
--boundary--
```

---

## 1️⃣ **authenticateToken** (Middleware Auth)

**File**: `src/shared/middleware/auth.ts`

### Cosa fa:
✅ Verifica la presenza del token JWT nell'header `Authorization: Bearer TOKEN`  
✅ Valida il token JWT con Cognito (firma RSA256)  
✅ Verifica issuer e algoritmo  
✅ Recupera l'utente dal database usando `cognitoSub`  
✅ Verifica che l'utente sia attivo (`isActive = true`)  
✅ Sincronizza il ruolo da Cognito Groups al DB  
✅ **Popola `req.user`** con i dati dell'utente (incluso `agencyId`)  

### Output:
```typescript
req.user = {
  id: "user-uuid",
  email: "agent@agency.it",
  role: "agent",
  agencyId: "agency-uuid",
  cognitoSub: "...",
  // ...altri campi
}
```

### Se FALLISCE:
❌ `401 Unauthorized` - Token mancante/invalido/scaduto  
❌ `401 Unauthorized` - Utente non trovato nel DB  
❌ `403 Forbidden` - Account disabilitato  
**→ La richiesta si ferma qui, non va avanti**

### Se SUCCEDE:
✅ Chiama `next()` → Passa al middleware successivo

---

## 2️⃣ **validatePropertyImageUploadPermissions** (Middleware Permessi)

**File**: `src/services/property-service/middleware/validateImageUpload.ts`

### Cosa fa:
✅ Verifica che `req.user` sia presente (doppio check, anche se `authenticateToken` lo garantisce)  
✅ Estrae `propertyId` da `req.params.propertyId`  
✅ Valida che `propertyId` sia un UUID v4 valido (regex)  
✅ Verifica che l'utente appartenga a un'agenzia (`req.user.agencyId` non null)  
✅ **Aggiunge `validatedPropertyId` a req** per uso successivo  

```typescript
req.validatedPropertyId = "550e8400-e29b-41d4-a716-446655440000"
```

### Se FALLISCE:
❌ `401 Unauthorized` - Utente non autenticato (non dovrebbe mai accadere)  
❌ `400 Bad Request` - PropertyId mancante o formato UUID invalido  
❌ `403 Forbidden` - Utente non appartiene a nessuna agenzia  
**→ La richiesta si ferma qui**

### Se SUCCEDE:
✅ Chiama `next()` → Passa al middleware successivo

---

## 3️⃣ **uploadToMemory.array('images', 10)** (Multer)

**File**: `src/shared/middleware/upload.ts`

### Cosa fa:
✅ Intercetta i file dalla richiesta `multipart/form-data`  
✅ Cerca il campo `images` nel form-data  
✅ Carica fino a **10 file** in memoria (buffer)  
✅ Applica il **file filter** per verificare i MIME types:
   - `image/jpeg`
   - `image/jpg`
   - `image/png`
   - `image/webp`
✅ Verifica che ogni file sia **≤ 5MB** (da config)  
✅ **Popola `req.files`** con l'array di file caricati  
✅ Lascia `req.body.metadata` intatto (campo non-file)

```typescript
req.files = [
  {
    fieldname: 'images',
    originalname: 'soggiorno.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer<...>,
    size: 1234567
  },
  {
    fieldname: 'images',
    originalname: 'cucina.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer<...>,
    size: 987654
  }
]

req.body = {
  metadata: '[{"isPrimary":true,"order":0},{"isPrimary":false,"order":1}]'
}
```

### Se FALLISCE:
❌ Genera un **MulterError** se:
  - File troppo grande (> 5MB)
  - Troppi file (> 10)
  - MIME type non consentito
  - Field name errato (non è `images`)
**→ L'errore viene catturato dal middleware successivo**

### Se SUCCEDE:
✅ Chiama `next()` → Passa al middleware successivo

---

## 4️⃣ **handleMulterError** (Gestore Errori Multer)

**File**: `src/shared/middleware/upload.ts` (presumibilmente)

### Cosa fa:
✅ Intercetta eventuali errori generati da Multer  
✅ Traduce gli errori tecnici in messaggi user-friendly  

### Errori gestiti:
- `LIMIT_FILE_SIZE` → "File troppo grande (max 5MB)"
- `LIMIT_FILE_COUNT` → "Troppi file (max 10)"
- `LIMIT_UNEXPECTED_FILE` → "Campo file inaspettato"
- Altri errori → Messaggio generico

### Se FALLISCE:
❌ `400 Bad Request` - Errore Multer specifico  
**→ La richiesta si ferma qui**

### Se SUCCEDE:
✅ Chiama `next()` → Passa al middleware successivo

---

## 5️⃣ **validateImageFiles** (Validazione Contenuto Immagini)

**File**: `src/services/property-service/middleware/validateImageUpload.ts`

### Cosa fa:
✅ Recupera i file da `req.files`  
✅ Per OGNI file:
  - 🔍 **Analizza con Sharp** (libreria image processing)
  - ✅ Verifica formato reale (non si fida del MIME type)
  - ✅ Formati consentiti: `jpeg`, `jpg`, `png`, `webp`
  - ✅ Legge dimensioni (width × height)
  - ✅ Max dimensioni: 10000×10000 pixel
  - ✅ Max risoluzione: 25 megapixel (prevenzione decompression bomb)
  - ✅ Verifica compression ratio (anti-malware)
  - ✅ Valida color channels (max 4)
  - ✅ **Aggiunge metadata al file**:
    ```typescript
    file.imageMetadata = {
      width: 1920,
      height: 1080,
      format: 'jpeg'
    }
    ```

### Validazioni di Sicurezza:
🛡️ **Decompression Bomb Protection**: Impedisce immagini compresse malevolmente che esplodono in memoria  
🛡️ **Suspicious Compression Ratio**: Rileva file con compressione anomala  
🛡️ **Real Format Check**: Usa Sharp per verificare il formato reale, non solo l'estensione

### Se FALLISCE:
❌ `400 Bad Request` - File validation failed
```json
{
  "details": [
    {
      "file": "soggiorno.jpg",
      "index": 0,
      "error": "Image dimensions too large (max 10000x10000)"
    }
  ]
}
```
**→ La richiesta si ferma qui**

### Se SUCCEDE:
✅ Tutti i file sono validi  
✅ `req.files` ora ha anche `imageMetadata` in ogni file  
✅ Chiama `next()` → Passa al middleware successivo

---

## 6️⃣ **validatePropertyImageMetadata** (Validazione Metadata + DTO Mapping)

**File**: `src/services/property-service/middleware/validatePropertyImageMetadata.ts`

### 🔥 **Middleware Chiave - Trasforma e Valida**

### Cosa fa - STEP by STEP:

#### **STEP 1: Recupera i file**
```typescript
const files = req.files as Express.Multer.File[];
// files = [File1, File2]
```

✅ Verifica che ci siano file caricati

#### **STEP 2: Parsa i metadata**
```typescript
let metadata: any[];
if (typeof req.body.metadata === 'string') {
  metadata = JSON.parse(req.body.metadata);  // Se è stringa JSON
} else if (Array.isArray(req.body.metadata)) {
  metadata = req.body.metadata;              // Se è già array
}
// metadata = [{isPrimary:true, order:0}, {isPrimary:false, order:1}]
```

✅ Gestisce sia JSON string che array già parsato

#### **STEP 3: Verifica corrispondenza**
```typescript
if (metadata.length !== files.length) {
  // ERRORE: 3 file ma 2 metadata
}
```

✅ Deve esserci **1 metadata per ogni file**

#### **STEP 4: Combina file + metadata**
```typescript
const propertyImages: PropertyImageFileRequest[] = files.map((file, index) => {
  // Crea istanza di PropertyImageMetadata
  const metadataObj = metadata[index];
  const imageMetadata = new PropertyImageMetadata(
    metadataObj.isPrimary,   // boolean
    metadataObj.order,       // number
    metadataObj.caption,     // string | undefined
    metadataObj.altText      // string | undefined
  );
  
  // Combina file + metadata in PropertyImageFileRequest
  return new PropertyImageFileRequest(file, imageMetadata);
});

// propertyImages = [
//   PropertyImageFileRequest { file: File1, metadata: Metadata1 },
//   PropertyImageFileRequest { file: File2, metadata: Metadata2 }
// ]
```

#### **STEP 5: Crea il DTO completo**
```typescript
const requestBody = plainToInstance(AddPropertyImageRequest, {
  propertyImages
});

// requestBody = AddPropertyImageRequest {
//   propertyImages: [PropertyImageFileRequest, PropertyImageFileRequest]
// }
```

#### **STEP 6: Validazione con class-validator**
```typescript
const errors = await validate(requestBody, validatorOptions);
```

✅ Esegue TUTTE le validazioni dei decoratori:
- `@IsArray()`
- `@ArrayMinSize(1)` / `@ArrayMaxSize(10)`
- `@ValidateNested()` - **ENTRA NEI NESTED!**
- Per ogni `PropertyImageFileRequest`:
  - `@IsDefined()` su `file`
  - `@IsDefined()` su `metadata`
  - `@ValidateNested()` su `metadata` - **ENTRA ANCORA PIÙ NEI NESTED!**
  - Per ogni `PropertyImageMetadata`:
    - `@IsBoolean()` su `isPrimary`
    - `@IsInt()`, `@Min(0)`, `@Max(99)` su `order`
    - `@IsOptional()`, `@IsString()`, `@MaxLength(500)` su `caption`
    - `@IsOptional()`, `@IsString()`, `@MaxLength(255)` su `altText`
- **CUSTOM VALIDATORS**:
  - `@OnlyOnePrimary()` - Verifica che solo 1 immagine abbia `isPrimary: true`
  - `@UniqueOrders()` - Verifica che ogni `order` sia unico

### Validazioni Custom - Come Funzionano:

```typescript
// @OnlyOnePrimary
// Conta quante immagini hanno isPrimary = true
// Se > 1 → ERRORE
const primaryCount = propertyImages.filter(img => img.metadata.isPrimary).length;
if (primaryCount > 1) {
  return "Only one image can be marked as primary";
}

// @UniqueOrders
// Verifica che non ci siano order duplicati
const orders = propertyImages.map(img => img.metadata.order);
const uniqueOrders = new Set(orders);
if (orders.length !== uniqueOrders.size) {
  return "Each image must have a unique order value";
}
```

#### **STEP 7: Gestione errori**
Se ci sono errori di validazione, vengono estratti **ricorsivamente** (inclusi nested):

```typescript
const extractErrors = (validationErrors): string[] => {
  for each error:
    - Aggiungi error.constraints (messaggi)
    - Se ha children → RICORSIONE (nested validation)
}
```

Esempio output errori:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "Only one image can be marked as primary",
    "propertyImages.0.metadata.order must be at least 0",
    "propertyImages.1.metadata.caption must not exceed 500 characters"
  ]
}
```

#### **STEP 8: Sostituisci req.body**
```typescript
req.body = requestBody;
// ADESSO req.body è di tipo AddPropertyImageRequest!
```

### Output Finale:
```typescript
req.body = AddPropertyImageRequest {
  propertyImages: [
    PropertyImageFileRequest {
      file: MulterFile { buffer, originalname, mimetype, ... },
      metadata: PropertyImageMetadata { isPrimary: true, order: 0, ... }
    },
    PropertyImageFileRequest {
      file: MulterFile { ... },
      metadata: PropertyImageMetadata { isPrimary: false, order: 1, ... }
    }
  ]
}
```

### Se FALLISCE:
❌ `400 Bad Request` - Validation failed
```json
{
  "details": [
    "Only one image can be marked as primary",
    "Each image must have a unique order value"
  ]
}
```
**→ La richiesta si ferma qui**

### Se SUCCEDE:
✅ `req.body` è ora un oggetto **completamente tipizzato e validato**  
✅ Chiama `next()` → Passa al controller

---

## 7️⃣ **propertyController.addPropertyImagePost** (Controller)

**File**: `src/services/property-service/controllers/PropertyController.ts`

### Cosa fa:

```typescript
async addPropertyImagePost(req: AuthenticatedRequest, res: Response) {
  // Type assertion sicura - il middleware ha già validato tutto
  const propertyImageRequest = req.body as AddPropertyImageRequest;
  const propertyId = req.params.propertyId;
  const userId = req.user!.id;  // Garantito da authenticateToken
  
  // Estrai file e metadata dall'oggetto validato
  const files = propertyImageRequest.propertyImages.map(img => img.file);
  const metadata = propertyImageRequest.propertyImages.map(img => img.metadata);
  
  // Chiama il service per upload S3 + salvataggio DB
  const result = await propertyService.addPropertyImages(
    propertyId,
    files,
    metadata,
    userId
  );
  
  // Response
  setResponseAsSuccess(res, result.data, result.message, 201);
}
```

### Il Controller:
✅ **NON fa validazioni** (già fatto dai middleware)  
✅ **NON controlla permessi** (già fatto dai middleware)  
✅ Si occupa SOLO della **business logic**:
  - Chiama il service
  - Gestisce la response
  - Gestisce eventuali errori di business (es. proprietà non trovata)

---

## 📊 Diagramma Flusso Dati

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Postman)                                                 │
│ POST /api/properties/550e.../images                             │
│ form-data: images (files) + metadata (JSON)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣ authenticateToken                                            │
│ INPUT:  Authorization header                                    │
│ OUTPUT: req.user = { id, agencyId, role, ... }                 │
│ VALIDA: JWT, utente esistente, account attivo                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2️⃣ validatePropertyImageUploadPermissions                       │
│ INPUT:  req.user, req.params.propertyId                        │
│ OUTPUT: req.validatedPropertyId                                │
│ VALIDA: PropertyId UUID, utente ha agenzia                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3️⃣ uploadToMemory.array('images', 10)                          │
│ INPUT:  multipart/form-data                                    │
│ OUTPUT: req.files = [File, File, ...], req.body.metadata      │
│ VALIDA: MIME type, dimensione file, numero file               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4️⃣ handleMulterError                                            │
│ INPUT:  Errori da Multer                                       │
│ OUTPUT: Response user-friendly se errore                       │
│ GESTISCE: Errori Multer                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5️⃣ validateImageFiles                                           │
│ INPUT:  req.files                                              │
│ OUTPUT: req.files con imageMetadata aggiunto                   │
│ VALIDA: Formato reale (Sharp), dimensioni, sicurezza          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6️⃣ validatePropertyImageMetadata                               │
│ INPUT:  req.files, req.body.metadata                           │
│ OUTPUT: req.body = AddPropertyImageRequest (tipizzato!)        │
│ COMBINA: file + metadata → PropertyImageFileRequest[]         │
│ VALIDA: class-validator (nested), custom validators           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7️⃣ propertyController.addPropertyImagePost                     │
│ INPUT:  req.body (AddPropertyImageRequest), req.user          │
│ LOGICA: Chiama service per upload S3 + save DB                │
│ OUTPUT: Response con URLs immagini caricate                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Riassunto Validazioni per Layer

### **Layer 1: Autenticazione & Autorizzazione**
- ✅ Token JWT valido
- ✅ Utente esistente e attivo
- ✅ Utente appartiene a un'agenzia
- ✅ PropertyId è un UUID valido

### **Layer 2: File Upload (Multer)**
- ✅ MIME type consentito
- ✅ Dimensione ≤ 5MB
- ✅ Numero file ≤ 10
- ✅ Campo corretto (`images`)

### **Layer 3: Contenuto File (Sharp)**
- ✅ Formato immagine reale
- ✅ Dimensioni valide (≤ 10000×10000)
- ✅ Risoluzione ≤ 25 megapixel
- ✅ Compression ratio sicuro
- ✅ Color channels validi

### **Layer 4: Metadata & DTO (class-validator)**
- ✅ Numero metadata = numero file
- ✅ Metadata formato JSON valido
- ✅ `isPrimary` è boolean
- ✅ `order` è integer (0-99)
- ✅ `caption` ≤ 500 caratteri
- ✅ `altText` ≤ 255 caratteri
- ✅ Solo 1 immagine primary
- ✅ Ordini unici

---

## 💡 Perché Questo Design?

### **Separation of Concerns**
Ogni middleware ha UNA responsabilità specifica:
- Auth → Identità
- Permissions → Autorizzazione
- Multer → Upload file
- ValidateFiles → Sicurezza contenuto
- ValidateMetadata → Validazione dati + mapping DTO
- Controller → Business logic

### **Defense in Depth** (Sicurezza a strati)
- MIME type check (Multer)
- Format check reale (Sharp)
- Dimension limits
- Security checks (decompression bomb, compression ratio)

### **Type Safety End-to-End**
- Request → Middleware → Controller → Service
- Tutto tipizzato con TypeScript + class-validator
- Il controller riceve oggetti già validati e tipizzati

### **Error Handling Granulare**
Ogni layer gestisce i propri errori:
- 401 → Autenticazione
- 403 → Permessi
- 400 → Validazione file/metadata
- 500 → Errori interni

---

## 🚀 Conclusione

Questo flusso garantisce:
✅ **Sicurezza massima** (autenticazione, autorizzazione, validazione file)  
✅ **Type safety completa** (DTO tipizzati end-to-end)  
✅ **Validazione robusta** (class-validator + custom validators)  
✅ **Errori chiari** (ogni layer restituisce messaggi specifici)  
✅ **Manutenibilità** (ogni middleware è indipendente e testabile)

È un design **production-ready** che segue le best practices! 🎉

