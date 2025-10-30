# API Endpoint: Upload Property Images

## POST /api/property/:propertyId/images

Carica una o più immagini per una proprietà.

### Architettura

L'upload delle immagini segue un'architettura a middleware con separazione delle responsabilità:

1. **authenticateToken** - Verifica JWT
2. **validatePropertyImageUploadPermissions** - Verifica permessi (autenticazione, propertyId, agencyId)
3. **uploadToMemory** - Carica file in memoria (multer)
4. **handleMulterError** - Gestisce errori di upload
5. **validateImageFiles** - Valida formalmente i file (formato, dimensioni, sicurezza)
6. **validatePropertyImageMetadata** - Valida metadata con class-validator
7. **addPropertyImagePost** - Controller (solo logica di business)
8. **PropertyService.addPropertyImages** - Service (gestisce upload S3 e salvataggio DB)

### Autenticazione
Richiede token JWT Bearer.

### Parametri URL
- `propertyId` (UUID) - ID della proprietà

### Request Body (multipart/form-data)

#### Files
- `images` - Array di file immagine (max 10, max 10MB ciascuno)
  - Formati supportati: JPEG, PNG, WebP
  - Dimensioni max: 10000x10000 pixel
  - Risoluzione max: 25 megapixel

#### Metadata (JSON array)
Un array JSON chiamato `metadata` contenente un oggetto per ogni immagine:

```json
{
  "metadata": [
    {
      "isPrimary": true,
      "order": 0,
      "caption": "Foto principale del soggiorno",
      "altText": "Soggiorno luminoso con vista mare"
    },
    {
      "isPrimary": false,
      "order": 1,
      "caption": "Cucina moderna",
      "altText": "Cucina attrezzata"
    }
  ]
}
```

### Validazioni

#### Permessi (validatePropertyImageUploadPermissions)
- ✅ Utente autenticato
- ✅ PropertyId valido (formato UUID)
- ✅ Utente appartiene a un'agenzia

#### File (validateImageFiles)
- ✅ Formato immagine valido (JPEG, PNG, WebP)
- ✅ Dimensioni immagine valide
- ✅ Sicurezza (anti decompression bomb, compression ratio)
- ✅ Canali colore validi

#### Metadata (validatePropertyImageMetadata con class-validator)
Ogni elemento dell'array `metadata` deve rispettare:

- **isPrimary** (boolean, obbligatorio)
  - Solo una immagine può avere `isPrimary: true` (@OnlyOnePrimary)
  
- **order** (integer, obbligatorio)
  - Min: 0, Max: 99 (@Min, @Max)
  - Deve essere univoco (@UniqueOrders)
  
- **caption** (string, opzionale)
  - Max 500 caratteri (@MaxLength)
  
- **altText** (string, opzionale)
  - Max 255 caratteri (@MaxLength)

#### Array
- Minimo 1 elemento (@ArrayMinSize)
- Massimo 10 elementi (@ArrayMaxSize)
- Numero elementi deve corrispondere al numero di file

### Response Success (201)

```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "images": [
      {
        "id": "uuid",
        "fileName": "image1.jpg",
        "fileSize": 1234567,
        "contentType": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "isPrimary": true,
        "order": 0,
        "caption": "Foto principale del soggiorno",
        "alt": "Soggiorno luminoso con vista mare",
        "uploadDate": "2025-10-28T10:30:00Z"
      }
    ],
    "warnings": []
  }
}
```

### Response Error (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "One or more validation errors occurred",
  "details": [
    "metadata[0].order: order must be at least 0",
    "Only one image can be marked as primary"
  ]
}
```

### Flusso dell'Upload

1. **Middleware validano** permessi, file e metadata
2. **Service riceve** i file raw (non ancora uploadati)
3. **Service verifica** permessi sulla proprietà
4. **Service esegue upload S3** per ogni file
5. **Service salva** i record nel database
6. **Service restituisce** risultati con eventuali warnings
7. **Controller formatta** e restituisce la risposta

### Gestione Errori

- Se l'upload S3 di un file fallisce, viene aggiunto ai **warnings**
- Se TUTTI gli upload falliscono, viene lanciato un errore
- Non viene fatto cleanup S3 in caso di errore (i file vengono mantenuti)

### Esempio cURL

```bash
curl -X POST "http://localhost:3000/api/property/123e4567-e89b-12d3-a456-426614174000/images" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F 'metadata=[{"isPrimary":true,"order":0,"caption":"Main photo"},{"isPrimary":false,"order":1,"caption":"Secondary photo"}]'
```

### Codice di Esempio (JavaScript/Fetch)

```javascript
const formData = new FormData();

// Aggiungi le immagini
formData.append('images', imageFile1);
formData.append('images', imageFile2);

// Aggiungi i metadata
const metadata = [
  {
    isPrimary: true,
    order: 0,
    caption: 'Foto principale',
    altText: 'Descrizione immagine 1'
  },
  {
    isPrimary: false,
    order: 1,
    caption: 'Foto secondaria',
    altText: 'Descrizione immagine 2'
  }
];

formData.append('metadata', JSON.stringify(metadata));

// Invia la richiesta
const response = await fetch('/api/property/:propertyId/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Vantaggi dell'Architettura

✅ **Separazione delle responsabilità**: ogni middleware ha un compito specifico
✅ **Riusabilità**: i middleware possono essere usati in altri endpoint
✅ **Testabilità**: ogni componente è testabile isolatamente
✅ **Manutenibilità**: facile individuare e modificare la logica
✅ **Upload nel service**: il service controlla quando e come fare l'upload
✅ **Validazione con class-validator**: dichiarativa, type-safe, riusabile

