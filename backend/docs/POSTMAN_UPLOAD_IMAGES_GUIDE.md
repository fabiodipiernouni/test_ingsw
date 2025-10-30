# Guida Postman - Upload Immagini Proprietà

## Come testare l'API di Upload Immagini con Postman

### 1. Configurazione Base

**URL Endpoint:**
```
POST http://localhost:3001/api/property/{propertyId}/images
```

Sostituisci `{propertyId}` con un UUID valido di una proprietà esistente.

---

### 2. Headers

Nella tab **Headers**:

| Key | Value |
|-----|-------|
| Authorization | `Bearer YOUR_JWT_TOKEN` |

> ⚠️ **Importante**: NON aggiungere manualmente `Content-Type: multipart/form-data`. Postman lo aggiunge automaticamente con il boundary corretto quando usi form-data.

---

### 3. Body Configuration

1. Nella tab **Body**, seleziona **form-data** (NON raw!)

2. Aggiungi i seguenti campi:

#### Campo 1: images (File 1)
- **Key**: `images` 
- **Type**: File (seleziona "File" dal dropdown a destra)
- **Value**: Click su "Select Files" e scegli la prima immagine

#### Campo 2: images (File 2) - Opzionale
- **Key**: `images`
- **Type**: File
- **Value**: Click su "Select Files" e scegli la seconda immagine

> 📝 Puoi aggiungere fino a 10 immagini, tutte con la stessa key `images`

#### Campo 3: metadata (JSON)
- **Key**: `metadata`
- **Type**: Text (mantieni come Text, NON File)
- **Value**: Incolla il seguente JSON:

```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Soggiorno luminoso con vista",
    "altText": "Vista del soggiorno principale"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Cucina moderna",
    "altText": "Cucina completamente attrezzata"
  }
]
```

> ⚠️ **Importante**: Il numero di oggetti nell'array metadata DEVE corrispondere esattamente al numero di file caricati!

---

### 4. Validazioni da Rispettare

#### File Immagini:
- ✅ Formati supportati: JPEG, PNG, WebP
- ✅ Dimensione max: 10MB per file
- ✅ Risoluzione max: 10000x10000 pixel
- ✅ Max 10 file in totale

#### Metadata:
- ✅ **isPrimary**: Solo UNA immagine può avere `isPrimary: true`
- ✅ **order**: Deve essere univoco, min 0, max 99
- ✅ **caption**: Max 500 caratteri (opzionale)
- ✅ **altText**: Max 255 caratteri (opzionale)

---

### 5. Esempi di Metadata

#### Esempio 1: Singola Immagine
```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Foto principale",
    "altText": "Vista frontale dell'immobile"
  }
]
```

#### Esempio 2: Multiple Immagini (3 foto)
```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Ingresso principale",
    "altText": "Vista dell'ingresso con porta blindata"
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
    "caption": "Camera da letto",
    "altText": "Camera matrimoniale con balcone"
  }
]
```

#### Esempio 3: Metadata Minimale (solo campi obbligatori)
```json
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

---

### 6. Response Attese

#### ✅ Success (201 Created)
```json
{
  "success": true,
  "message": "Successfully uploaded 2 image(s)",
  "data": {
    "images": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "fileName": "image1.jpg",
        "fileSize": 1234567,
        "contentType": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "isPrimary": true,
        "order": 0,
        "caption": "Soggiorno luminoso con vista",
        "alt": "Vista del soggiorno principale",
        "uploadDate": "2025-10-29T10:30:00Z",
        "urls": {
          "original": "https://...",
          "small": "https://...",
          "medium": "https://...",
          "large": "https://..."
        }
      }
    ],
    "warnings": []
  },
  "timestamp": "2025-10-29T10:30:00Z"
}
```

#### ❌ Error - File non valido (400)
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid image file",
  "details": [
    "File image1.jpg: Invalid image format. Allowed: jpeg, png, webp"
  ]
}
```

#### ❌ Error - Metadata non valido (400)
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    "Only one image can be marked as primary",
    "metadata[1].order: Each image must have a unique order value"
  ]
}
```

#### ❌ Error - Non autenticato (401)
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "No token provided"
}
```

#### ❌ Error - Proprietà non trovata (404)
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Property not found"
}
```

---

### 7. Checklist Pre-Test

Prima di inviare la richiesta, verifica:

- [ ] Hai un JWT token valido nell'header Authorization
- [ ] Il propertyId nell'URL è un UUID valido di una proprietà esistente
- [ ] Hai selezionato "form-data" nella tab Body
- [ ] Tutti i campi `images` hanno Type = File
- [ ] Il campo `metadata` ha Type = Text
- [ ] Il numero di oggetti nel metadata JSON corrisponde al numero di file
- [ ] Solo un oggetto ha `isPrimary: true`
- [ ] Tutti gli `order` sono univoci
- [ ] Le immagini sono in formato JPEG, PNG o WebP
- [ ] Ogni immagine è sotto i 10MB

---

### 8. Troubleshooting Comuni

#### Errore: "metadata must be an array"
- ✅ Soluzione: Assicurati che il metadata sia un array JSON `[...]` e non un oggetto `{...}`

#### Errore: "Number of metadata entries must match number of files"
- ✅ Soluzione: Conta i file caricati e assicurati di avere lo stesso numero di oggetti nel metadata

#### Errore: "Only one image can be marked as primary"
- ✅ Soluzione: Imposta `isPrimary: true` solo per UN elemento del metadata

#### Errore: "Each image must have a unique order value"
- ✅ Soluzione: Assegna valori `order` diversi (es: 0, 1, 2, 3...)

#### Errore: "Invalid image format"
- ✅ Soluzione: Usa solo file JPEG (.jpg, .jpeg), PNG (.png) o WebP (.webp)

#### Postman non invia i file
- ✅ Soluzione: Assicurati di aver selezionato "File" dal dropdown del Type, non "Text"

---

### 9. Testare Scenari Specifici

#### Test 1: Upload Singola Immagine Principale
- File: 1 immagine
- Metadata: `[{"isPrimary": true, "order": 0}]`

#### Test 2: Upload Multiplo con Caption
- File: 3 immagini
- Metadata: Array con 3 oggetti, ciascuno con caption e altText

#### Test 3: Upload Massimo (10 immagini)
- File: 10 immagini
- Metadata: Array con 10 oggetti, order da 0 a 9

#### Test 4: Errore - Troppi File
- File: 11 immagini (dovrebbe fallire)

#### Test 5: Errore - Metadata Mancante
- File: 2 immagini
- Metadata: Array con solo 1 oggetto (dovrebbe fallire)

---

### 10. Video Tutorial (Steps)

1. Apri Postman
2. Crea una nuova richiesta POST
3. Inserisci l'URL con il propertyId
4. Vai su Headers → Aggiungi Authorization Bearer
5. Vai su Body → Seleziona form-data
6. Aggiungi campo `images` (File) → Seleziona immagine
7. Ripeti per altre immagini (stesso nome `images`)
8. Aggiungi campo `metadata` (Text) → Incolla JSON array
9. Click Send
10. Verifica la risposta

---

## Note Importanti

⚠️ **Autenticazione**: Devi prima fare login e ottenere un JWT token valido

⚠️ **Permessi**: L'utente deve essere un agente della stessa agenzia della proprietà

⚠️ **Ambiente**: Assicurati che il backend sia in esecuzione su `http://localhost:3001`

⚠️ **S3**: Le immagini vengono caricate su AWS S3, quindi assicurati che le credenziali AWS siano configurate correttamente nel backend

