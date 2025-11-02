# 📸 QUICK START: Upload Immagini Proprietà con Postman

## TL;DR

**Tipo Body**: `form-data`  
**Campi necessari**:
1. `images` (File, ripeti per ogni immagine)
2. `metadata` (Text, JSON array)

---

## Passo per Passo

### 1️⃣ Imposta la Richiesta

```
Method: POST
URL: http://localhost:3001/api/properties/{propertyId}/images
```

Sostituisci `{propertyId}` con l'UUID della proprietà.

### 2️⃣ Aggiungi il Token

Tab: **Authorization**
- Type: `Bearer Token`
- Token: Il tuo JWT token

### 3️⃣ Configura il Body

Tab: **Body**
- Seleziona: ✅ **form-data**

### 4️⃣ Aggiungi i File

Per ogni immagine da caricare:

| Key     | Type | Value           |
|---------|------|-----------------|
| images  | File | [Seleziona file]|
| images  | File | [Seleziona file]|
| images  | File | [Seleziona file]|

**⚠️ IMPORTANTE**: 
- Usa SEMPRE la stessa chiave `images` (senza numeri!)
- Cambia il dropdown da "Text" a "File"
- Postman li invierà come array automaticamente

### 5️⃣ Aggiungi i Metadata

| Key      | Type | Value                     |
|----------|------|---------------------------|
| metadata | Text | `[{ ...oggetti JSON... }]`|

---

## 📋 Template Metadata

### Per 1 Immagine
```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Vista frontale",
    "altText": "Facciata principale"
  }
]
```

### Per 3 Immagini
```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Soggiorno",
    "altText": "Soggiorno luminoso"
  },
  {
    "isPrimary": false,
    "order": 1,
    "caption": "Cucina",
    "altText": "Cucina moderna"
  },
  {
    "isPrimary": false,
    "order": 2,
    "caption": "Camera",
    "altText": "Camera matrimoniale"
  }
]
```

### Minimale (solo campi obbligatori)
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

## ✅ Checklist

- [ ] Ho **esattamente lo stesso numero** di file e oggetti metadata?
- [ ] C'è **una sola** immagine con `isPrimary: true`?
- [ ] Ogni immagine ha un valore `order` **unico**?
- [ ] Il metadata è un **array JSON valido**? (Controlla su jsonlint.com)
- [ ] I file sono immagini valide (jpg, jpeg, png, webp)?
- [ ] Ogni file è < 5MB?

---

## 🎯 Screenshot Postman

```
┌─ POST http://localhost:3001/api/properties/abc-123.../images ─┐
│                                                                 │
│ Headers                                                         │
│   Authorization: Bearer eyJhbGciOiJ...                         │
│                                                                 │
│ Body  ○ none  ○ form-data  ● x-www-form-urlencoded  ○ raw     │
│                                                                 │
│   KEY       │ VALUE              │ TYPE                        │
│   ─────────┼───────────────────┼─────                         │
│   images    │ soggiorno.jpg      │ File  ✓                    │
│   images    │ cucina.jpg         │ File  ✓                    │
│   images    │ camera.jpg         │ File  ✓                    │
│   metadata  │ [{...JSON...}]     │ Text  ✓                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ❌ Errori Comuni

### "Metadata count mismatch"
❌ Hai 3 file ma 2 oggetti metadata  
✅ **Soluzione**: Aggiungi esattamente 1 oggetto metadata per ogni file

### "Only one image can be marked as primary"
❌ Hai 2 oggetti con `isPrimary: true`  
✅ **Soluzione**: Imposta `isPrimary: true` solo in 1 oggetto

### "Each image must have a unique order value"
❌ Hai 2 oggetti con `order: 0`  
✅ **Soluzione**: Usa 0, 1, 2, 3... (valori diversi)

### "metadata must be a valid JSON array"
❌ Il JSON ha errori di sintassi  
✅ **Soluzione**: Copia-incolla il JSON su jsonlint.com per validarlo

---

## 💡 Tips Pro

1. **Test con 1 immagine**: Prima prova con una singola immagine per verificare che tutto funzioni

2. **Usa Postman Environment**: Salva `propertyId` e `jwt_token` come variabili:
   ```
   {{base_url}}/api/properties/{{propertyId}}/images
   ```

3. **Genera il JSON**: Per tante immagini, usa questo script JS nella console Postman:
   ```javascript
   const count = 5; // Numero di immagini
   const metadata = Array.from({length: count}, (_, i) => ({
     isPrimary: i === 0,
     order: i,
     caption: `Immagine ${i + 1}`
   }));
   console.log(JSON.stringify(metadata, null, 2));
   ```

4. **Ordine Files = Ordine Metadata**: Il primo file corrisponde al primo oggetto metadata, il secondo al secondo, ecc.

---

## 📦 Response di Successo

```json
{
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "uploadedCount": 3,
    "images": [
      {
        "id": "uuid-1",
        "url": "https://s3.../soggiorno.jpg",
        "isPrimary": true,
        "order": 0
      },
      ...
    ]
  }
}
```

---

## 🆘 Hai ancora problemi?

1. Controlla i log del server per messaggi di errore dettagliati
2. Verifica che il `propertyId` esista e appartenga al tuo utente
3. Controlla che il token JWT non sia scaduto
4. Usa il file `test/property-service.http` per esempi funzionanti

