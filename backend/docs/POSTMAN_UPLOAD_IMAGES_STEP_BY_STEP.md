# Guida Postman: Upload Immagini Proprietà

## Endpoint
```
POST /api/properties/:propertyId/images
```

## Autenticazione
Aggiungi il Bearer Token nell'header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Configurazione Body in Postman

### Tipo: `form-data`

Devi inviare i dati come `form-data` perché stai caricando file.

### Campi da aggiungere:

#### 1. File (multipli)
- **Key**: `images` (questo nome deve corrispondere a quello nel middleware Multer)
- **Type**: `File`
- **Value**: Seleziona uno o più file immagine (max 10)

**IMPORTANTE**: Puoi aggiungere più file con lo stesso nome chiave `images`. Postman li invierà come array.

#### 2. Metadata (JSON)
- **Key**: `metadata`
- **Type**: `Text`
- **Value**: Un array JSON che contiene i metadata per ogni immagine

## Esempio Pratico

### Scenario: Upload di 3 immagini

#### Campi form-data:

| Key      | Type | Value                                                                                                                                                                                                |
|----------|------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| images   | File | `image1.jpg`                                                                                                                                                                                         |
| images   | File | `image2.jpg`                                                                                                                                                                                         |
| images   | File | `image3.jpg`                                                                                                                                                                                         |
| metadata | Text | `[{"isPrimary": true, "order": 0, "caption": "Vista frontale", "altText": "Facciata principale"}, {"isPrimary": false, "order": 1, "caption": "Cucina"}, {"isPrimary": false, "order": 2}]` |

### Struttura JSON dei Metadata

```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Vista frontale",
    "altText": "Facciata principale dell'immobile"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Cucina moderna",
    "altText": "Cucina completamente arredata"
  },
  {
    "isPrimary": false,
    "order": 2,
    "caption": "Camera da letto",
    "altText": "Camera matrimoniale con vista"
  }
]
```

## Regole di Validazione

### Metadata (per ogni oggetto nell'array):

- **isPrimary** (obbligatorio): `boolean` - Una sola immagine può essere primary
- **order** (obbligatorio): `number` (intero da 0 a 99) - Ogni immagine deve avere un ordine unico
- **caption** (opzionale): `string` (max 500 caratteri) - Didascalia dell'immagine
- **altText** (opzionale): `string` (max 255 caratteri) - Testo alternativo per accessibilità

### Vincoli:
- Minimo 1 immagine, massimo 10
- Il numero di oggetti metadata deve corrispondere al numero di file
- Solo una immagine può avere `isPrimary: true`
- Ogni `order` deve essere unico
- Formati supportati: jpg, jpeg, png, webp
- Dimensione massima per file: 5MB

## Screenshot Postman

### 1. Imposta il metodo e l'URL
```
POST http://localhost:3001/api/properties/123e4567-e89b-12d3-a456-426614174000/images
```

### 2. Aggiungi l'autenticazione
- Tab: **Authorization**
- Type: **Bearer Token**
- Token: `[il tuo JWT token]`

### 3. Configura il Body
- Tab: **Body**
- Seleziona: **form-data**

### 4. Aggiungi i file
- Clicca su "Add key"
- Nome campo: `images`
- Cambia il tipo da "Text" a "File" (dropdown a destra)
- Clicca su "Select Files" e scegli la prima immagine
- Ripeti per ogni immagine (sempre con chiave `images`)

### 5. Aggiungi i metadata
- Clicca su "Add key"
- Nome campo: `metadata`
- Tipo: Text
- Valore: Incolla il JSON array dei metadata

## Esempio di Response di Successo

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "uploadedCount": 3,
    "images": [
      {
        "id": "img-uuid-1",
        "url": "https://s3.../image1.jpg",
        "isPrimary": true,
        "order": 0,
        "caption": "Vista frontale"
      },
      {
        "id": "img-uuid-2",
        "url": "https://s3.../image2.jpg",
        "isPrimary": false,
        "order": 1,
        "caption": "Cucina"
      },
      {
        "id": "img-uuid-3",
        "url": "https://s3.../image3.jpg",
        "isPrimary": false,
        "order": 2,
        "caption": "Camera da letto"
      }
    ]
  },
  "timestamp": "2025-11-02T10:30:00.000Z"
}
```

## Errori Comuni

### 1. Mismatch tra file e metadata
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Metadata count mismatch",
  "details": ["Expected 3 metadata objects, got 2"]
}
```
**Soluzione**: Assicurati che ci sia un oggetto metadata per ogni file caricato.

### 2. Metadata non è un array JSON valido
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid metadata format",
  "details": ["metadata must be a valid JSON array"]
}
```
**Soluzione**: Verifica che il JSON sia sintatticamente corretto (usa un JSON validator).

### 3. Più di una immagine primary
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "One or more validation errors occurred",
  "details": ["Only one image can be marked as primary"]
}
```
**Soluzione**: Imposta `isPrimary: true` solo per una immagine.

### 4. Order duplicati
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "One or more validation errors occurred",
  "details": ["Each image must have a unique order value"]
}
```
**Soluzione**: Assicurati che ogni immagine abbia un valore `order` unico.

## Tips

1. **Testare con 1 immagine prima**: Inizia caricando una singola immagine per verificare che tutto funzioni
2. **Usa variabili Postman**: Salva il `propertyId` e il `token` come variabili d'ambiente
3. **Valida il JSON**: Usa un tool come JSONLint per verificare il formato dei metadata prima di inviare
4. **Ordine dei file**: L'ordine con cui aggiungi i file in Postman corrisponde all'ordine nell'array metadata

## Collection Postman

Puoi importare la collection pre-configurata:
```
docs/DietiEstates_PropertyImages.postman_collection.json
```

