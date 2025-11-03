# 📝 API PATCH - Aggiornamento Parziale Proprietà

## 🎯 Panoramica

L'API PATCH permette di aggiornare **uno o più campi** di una proprietà esistente senza dover inviare tutti i dati. Solo i campi presenti nel body della richiesta vengono modificati.

---

## 📍 Endpoint

```
PATCH /api/properties/:propertyId
```

**Autenticazione**: Richiesta (Bearer Token)  
**Autorizzazione**: Solo il proprietario (agentId) può modificare la proprietà

---

## 🔄 Flusso Middleware

```
1. authenticateToken
   ↓ Verifica JWT e popola req.user
   
2. validatePropertyUpdatePermissions
   ↓ Verifica UUID, esistenza proprietà, ownership
   ↓ Pre-carica la proprietà in req.property
   
3. validatePropertyUpdate
   ↓ Valida i campi presenti con class-validator
   ↓ skipMissingProperties: true (valida solo campi presenti)
   
4. PropertyController.updateProperty
   ↓ Business logic (aggiornamento DB)
```

---

## 📋 Campi Aggiornabili

Tutti i campi sono **opzionali** - solo quelli presenti vengono aggiornati:

### Campi Base
- `title` - string (max 200 caratteri)
- `description` - string (max 4000 caratteri)
- `price` - number (0 - 99999999.99, max 2 decimali)
- `status` - enum: `active`, `pending`, `sold`, `rented`, `withdrawn`
- `propertyType` - enum: `apartment`, `villa`, `house`, `loft`, `office`, `commercial`, `land`
- `listingType` - enum: `sale`, `rent`

### Caratteristiche
- `rooms` - integer (min 0)
- `bedrooms` - integer (min 0)
- `bathrooms` - integer (min 0)
- `area` - number (0 - 999999.99, max 2 decimali)
- `floor` - string (max 50 caratteri)
- `energyClass` - enum: `A+`, `A`, `B`, `C`, `D`, `E`, `F`, `G`

### Dotazioni (boolean)
- `hasElevator`
- `hasBalcony`
- `hasGarden`
- `hasParking`

### Altri
- `features` - array di stringhe (max 100 caratteri ciascuna)
- `address` - oggetto Address completo
- `location` - GeoJSON Point

---

## 💡 Casi d'Uso Comuni

### 1. Cambio Status (Vendita/Affitto completati)

```http
PATCH /api/properties/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "status": "sold"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Property updated successfully. 1 field(s) modified.",
  "data": { ...proprietà completa... },
  "timestamp": "2025-11-03T10:30:00.000Z"
}
```

### 2. Aggiornamento Prezzo

```http
PATCH /api/properties/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "price": 280000
}
```

### 3. Aggiornamento Multiplo

```http
PATCH /api/properties/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "status": "active",
  "price": 250000,
  "description": "Appartamento completamente ristrutturato",
  "hasElevator": true,
  "features": ["ristrutturato", "doppi vetri", "climatizzato"]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Property updated successfully. 5 field(s) modified.",
  "data": { ...proprietà completa... }
}
```

### 4. Cambio Indirizzo Completo

```http
PATCH /api/properties/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "address": {
    "street": "Via Roma 123",
    "city": "Milano",
    "province": "MI",
    "zipCode": "20121",
    "country": "Italia"
  }
}
```

**Nota**: Se l'indirizzo viene modificato, la `location` geografica viene ricalcolata automaticamente.

### 5. Aggiornamento Caratteristiche

```http
PATCH /api/properties/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "rooms": 5,
  "bedrooms": 3,
  "bathrooms": 2,
  "area": 135.50,
  "energyClass": "A"
}
```

---

## ❌ Gestione Errori

### 400 - Validazione Fallita

**Esempio 1: Status non valido**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": [
    "Status must be one of: active, pending, sold, rented, withdrawn"
  ]
}
```

**Esempio 2: Nessun campo da aggiornare**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": [
    "At least one field must be provided for update"
  ]
}
```

**Esempio 3: Prezzo negativo**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": [
    "Price must be at least 0"
  ]
}
```

### 401 - Non Autenticato

```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Access token required"
}
```

### 403 - Non Autorizzato (non sei il proprietario)

```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "You do not have permission to update this property"
}
```

### 404 - Proprietà Non Trovata

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Property not found"
}
```

---

## 🔐 Regole di Autorizzazione

1. ✅ Solo l'**agente proprietario** (agentId) può modificare la proprietà
2. ✅ Il middleware verifica l'ownership PRIMA di validare il body
3. ✅ La proprietà viene pre-caricata per evitare query duplicate

---

## 🎓 Differenze tra POST e PATCH

| Aspetto | POST (Creazione) | PATCH (Aggiornamento) |
|---------|------------------|----------------------|
| **Scopo** | Crea nuova risorsa | Aggiorna risorsa esistente |
| **PropertyId** | Non richiesto (generato) | Richiesto nel path |
| **Campi** | Tutti obbligatori (tranne opzionali) | Tutti opzionali |
| **Validazione** | Valida tutti i campi | Valida solo campi presenti |
| **Response** | 201 Created | 200 OK |
| **Body vuoto** | Errore (mancano campi) | Errore (almeno 1 campo) |

---

## 🧪 Test con WebStorm HTTP Client

Il file `test/property-service.http` contiene esempi pronti all'uso:

```http
### Aggiorna solo status
PATCH http://localhost:3002/api/properties/{{property_id}}
Content-Type: application/json
Authorization: Bearer {{jwt_token}}

{
  "status": "sold"
}
```

**Variabili** (configura in `http-client.env.json`):
- `{{property_id}}` - UUID della proprietà
- `{{jwt_token}}` - Token JWT ottenuto dal login

---

## 🚀 Best Practices

### ✅ DO

1. **Aggiorna solo i campi necessari**
   ```json
   { "status": "sold" }
   ```
   Non:
   ```json
   { "status": "sold", "title": "...", "description": "...", ... }
   ```

2. **Usa PATCH per aggiornamenti parziali**
   - PATCH = aggiornamento parziale
   - PUT = sostituzione completa (non implementato)

3. **Valida lato client prima di inviare**
   - Verifica formati enum (`status`, `propertyType`, ecc.)
   - Controlla limiti numerici

### ❌ DON'T

1. **Non inviare campi immutabili**
   - `id` (readonly)
   - `createdAt` (readonly)
   - `agentId` (ownership non cambia)

2. **Non inviare body vuoto**
   ```json
   {}  // ❌ Errore: almeno 1 campo richiesto
   ```

3. **Non modificare proprietà di altri agenti**
   - Il sistema lo blocca automaticamente (403)

---

## 📊 Logging

Il sistema logga automaticamente:

```javascript
logger.info('Property update request from agent {agentId}', {
  propertyId,
  fieldsToUpdate: ['status', 'price', 'description'],
  agentId
});

logger.info('Property {propertyId} updated successfully', {
  fieldsUpdated: ['status', 'price', 'description'],
  agentId
});
```

---

## 🔍 Troubleshooting

### Problema: 400 - "At least one field must be provided"
**Causa**: Body vuoto `{}`  
**Soluzione**: Aggiungi almeno un campo da aggiornare

### Problema: 403 - "You do not have permission"
**Causa**: Stai cercando di modificare una proprietà di un altro agente  
**Soluzione**: Usa solo il tuo propertyId (agentId deve corrispondere)

### Problema: 400 - UUID non valido
**Causa**: PropertyId nel path non è un UUID v4  
**Soluzione**: Usa format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

### Problema: Campi non vengono aggiornati
**Causa**: Stai inviando campi con nomi errati  
**Soluzione**: Verifica i nomi esatti (case-sensitive): `hasElevator`, non `has_elevator`

---

## ✨ Vantaggi di PATCH

1. **Efficienza**: Invia solo i dati che cambiano
2. **Bandwidth**: Risparmio di traffico rete
3. **Sicurezza**: Validazione granulare per campo
4. **Flessibilità**: Aggiorna 1 o 20 campi con la stessa API
5. **Atomicità**: Transazione singola per tutti i campi

---

## 🎉 Conclusione

L'API PATCH è la soluzione **REST-compliant** e **production-ready** per aggiornamenti parziali. Usa class-validator per validazioni robuste e garantisce type-safety end-to-end con TypeScript.

**Pronto per produzione!** 🚀

