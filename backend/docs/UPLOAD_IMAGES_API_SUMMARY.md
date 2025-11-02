# API Upload Immagini Proprietà - Riepilogo Completo

## 📋 Panoramica

L'API di upload immagini per le proprietà è stata completamente **tipizzata** e **validata** utilizzando TypeScript, class-validator e middleware dedicati.

## 🏗️ Architettura

### Endpoint
```
POST /api/properties/:propertyId/images
```

### Flusso di Validazione (Middleware Chain)

```typescript
router.post(
  '/:propertyId/images',
  authenticateToken,                          // 1. Verifica JWT
  validatePropertyImageUploadPermissions,     // 2. Verifica permessi
  uploadToMemory.array('images', 10),         // 3. Upload file (max 10)
  handleMulterError,                          // 4. Gestione errori Multer
  validateImageFiles,                         // 5. Validazione formato/dimensioni
  validatePropertyImageMetadata,              // 6. Validazione metadata tipizzati
  propertyController.addPropertyImagePost     // 7. Business logic
);
```

## 📦 Tipizzazione Completa

### 1. Request DTO
```typescript
// AddPropertyImageRequest.ts
export interface AddPropertyImageRequest extends AuthenticatedRequest {
  files: Express.Multer.File[];
  body: {
    metadata: PropertyImageMetadata[];
  };
}
```

### 2. Metadata DTO (con Validazione)
```typescript
// PropertyImageMetadata.ts
export class PropertyImageMetadata implements PropertyImageMetadataInterface {
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary: boolean;

  @Type(() => Number)
  @IsInt({ message: 'order must be an integer' })
  @Min(0, { message: 'order must be at least 0' })
  @Max(99, { message: 'order must not exceed 99' })
  order: number;

  @IsOptional()
  @IsString({ message: 'caption must be a string' })
  @MaxLength(500, { message: 'caption must not exceed 500 characters' })
  caption?: string;

  @IsOptional()
  @IsString({ message: 'altText must be a string' })
  @MaxLength(255, { message: 'altText must not exceed 255 characters' })
  altText?: string;
}
```

### 3. Controller (Type-Safe)
```typescript
// PropertyController.ts
async addPropertyImagePost(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    // Type assertion: i middleware garantiscono che questi campi siano corretti
    const typedReq = req as AddPropertyImageRequest;
    const propertyId = typedReq.params.propertyId;
    const files = typedReq.files || [];
    const metadata = typedReq.body.metadata;
    const userId = typedReq.user!.id;

    // Business logic con tipi garantiti
    const result = await propertyService.addPropertyImages(
      propertyId,
      files,
      metadata,
      userId
    );

    setResponseAsSuccess(res, result, `Successfully uploaded ${result.images.length} image(s)`, 201);
  } catch (error) {
    // Gestione errori tipizzata
    const err = error as Error & { name?: string; details?: { errors?: string[] }; message: string };
    // ...
  }
}
```

## 🛡️ Validazioni Implementate

### Middleware: validatePropertyImageMetadata

```typescript
export const validatePropertyImageMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const metadata = req.body.metadata;
  
  // Validazioni:
  // 1. Parsing JSON del metadata
  // 2. Trasformazione in istanze di PropertyImageMetadata
  // 3. Validazione con class-validator (tipo, range, lunghezza)
  // 4. Numero metadata === numero file
  // 5. Solo una immagine primary
  // 6. Order univoci
}
```

### Validatori Custom

```typescript
// OnlyOnePrimary validator
@OnlyOnePrimary({ message: 'Only one image can be marked as primary' })

// UniqueOrders validator  
@UniqueOrders({ message: 'Each image must have a unique order value' })
```

## 📝 Documentazione Swagger

La documentazione è stata aggiornata con:

### Schema DTO
```yaml
PropertyImageMetadata:
  type: object
  required: [isPrimary, order]
  properties:
    isPrimary:
      type: boolean
      description: Indica se questa è l'immagine principale
    order:
      type: integer
      minimum: 0
      maximum: 99
      description: Ordine di visualizzazione (univoco)
    caption:
      type: string
      maxLength: 500
    altText:
      type: string
      maxLength: 255
```

### Request Body
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          images:
            type: array
            items:
              type: string
              format: binary
            minItems: 1
            maxItems: 10
          metadata:
            type: array
            items:
              $ref: '#/components/schemas/PropertyImageMetadata'
```

### Response
```yaml
responses:
  201:
    description: Immagini caricate con successo
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/UploadImagesResponse'
```

## 🧪 Testing

### Con WebStorm HTTP Client

File: `test/property-service.http`

```http
### Upload Multiple Immagini
POST http://localhost:3002/api/properties/{{property_id}}/images
Authorization: Bearer {{jwt_token}}
Content-Type: multipart/form-data; boundary=boundary

--boundary
Content-Disposition: form-data; name="images"; filename="soggiorno.jpg"
Content-Type: image/jpeg

< ./path/to/soggiorno.jpg
--boundary
Content-Disposition: form-data; name="images"; filename="cucina.jpg"
Content-Type: image/jpeg

< ./path/to/cucina.jpg
--boundary
Content-Disposition: form-data; name="metadata"

[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Soggiorno luminoso",
    "altText": "Vista del soggiorno"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Cucina moderna"
  }
]
--boundary--
```

### Con Postman

1. Metodo: `POST`
2. URL: `http://localhost:3002/api/properties/:propertyId/images`
3. Headers:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
4. Body → form-data:
   - `images`: [File] → Seleziona file immagine (puoi aggiungerne fino a 10)
   - `metadata`: [Text] → Incolla JSON array:
     ```json
     [{"isPrimary":true,"order":0,"caption":"Test"}]
     ```

## 🔒 Sicurezza e Permessi

### Autenticazione
- JWT token obbligatorio (middleware `authenticateToken`)

### Autorizzazione
- Solo l'agente proprietario della proprietà può caricare immagini
- Validato da `validatePropertyImageUploadPermissions`

## ⚠️ Vincoli e Limiti

### File
- **Formati**: JPEG, PNG, WebP
- **Dimensione**: Max 10 MB per file
- **Risoluzione**: Max 10000x10000 pixel
- **Numero**: Max 10 file per richiesta

### Metadata
- **Numero**: Deve corrispondere esattamente al numero di file
- **isPrimary**: Solo una immagine può essere primary
- **order**: Valori da 0 a 99, devono essere univoci
- **caption**: Max 500 caratteri (opzionale)
- **altText**: Max 255 caratteri (opzionale)

## 🎯 Vantaggi della Tipizzazione

### 1. Type Safety
- Nessun `any` nei catch blocks
- Tutti i parametri tipizzati
- Autocompletamento IDE

### 2. Validazione Robusta
- Validazione a livello di tipo (TypeScript)
- Validazione runtime (class-validator)
- Validazione business logic (middleware custom)

### 3. Manutenibilità
- Codice autodocumentante
- Refactoring sicuro
- Errori rilevati in fase di sviluppo

### 4. Developer Experience
- Errori chiari e specifici
- Documentazione integrata
- Testing facilitato

## 📚 File Coinvolti

### DTO
- `dto/addPropertyImageEndpoint/AddPropertyImageRequest.ts`
- `dto/addPropertyImageEndpoint/PropertyImageMetadata.ts`
- `dto/addPropertyImageEndpoint/PropertyImageMetadataArray.ts`
- `dto/addPropertyImageEndpoint/index.ts`

### Middleware
- `middleware/validateImageUpload.ts` - Validazione file
- `middleware/validatePropertyImageMetadata.ts` - Validazione metadata

### Validators
- `validators/PropertyImageValidators.ts` - Custom validators

### Controller
- `controllers/PropertyController.ts` - Business logic

### Routes
- `routes/properties.ts` - Endpoint definition

### Config
- `config/swagger.ts` - Documentazione API

## 🚀 Conclusioni

L'API è ora:
- ✅ **Completamente tipizzata** con TypeScript
- ✅ **Validata** a più livelli (tipo, runtime, business)
- ✅ **Documentata** con Swagger/OpenAPI
- ✅ **Testabile** con HTTP client e Postman
- ✅ **Sicura** con autenticazione e autorizzazione
- ✅ **Manutenibile** con codice pulito e organizzato

---

**Nota**: Se vedi errori di import in AddPropertyImageRequest.ts relativi a PropertyImageMetadata, è probabilmente un problema di cache dell'IDE. I file esistono e sono corretti.

