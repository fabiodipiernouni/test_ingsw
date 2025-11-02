# 🚀 Riepilogo: Come Testare l'API di Upload Immagini

## ✅ Swagger.ts - Aggiornato

Il file `swagger.ts` è stato aggiornato con successo e include ora:

- ✅ Schema `ImageMetadataDto`
- ✅ Schema `UploadImagesRequest`
- ✅ Schema `UploadImagesResponse`
- ✅ Schema `GetGeoPropertiesCardsRequest`
- ✅ Schema `GetPropertiesByIdListRequest`

Tutti gli schemi sono completi e documentati secondo OpenAPI 3.0.

---

## 📋 Opzioni per Testare l'API

Hai **3 opzioni** per testare l'API di upload delle immagini:

### 1️⃣ Postman (CONSIGLIATO per Upload)

✅ **Vantaggi:**
- Supporto completo per multipart/form-data
- Upload di file reali facile
- Collection pre-configurata disponibile

📖 **Come usare:**
1. Importa la collection: `docs/DietiEstates_PropertyImages.postman_collection.json`
2. Segui la guida: `docs/POSTMAN_UPLOAD_IMAGES_GUIDE.md`

**Step rapidi:**
```
1. Endpoint: POST http://localhost:3002/api/properties/{propertyId}/images
2. Headers: Authorization: Bearer YOUR_JWT_TOKEN
3. Body (form-data):
   - images (File): seleziona le immagini
   - metadata (Text): JSON con metadata
```

Esempio metadata:
```json
[
  {
    "isPrimary": true,
    "order": 0,
    "caption": "Soggiorno luminoso",
    "altText": "Vista del soggiorno"
  }
]
```

---

### 2️⃣ WebStorm HTTP Client

⚠️ **Limitazione:** WebStorm NON supporta l'upload di file binari nei file `.http`

✅ **Cosa PUOI fare:**
- Testare tutte le API GET/POST con JSON
- Creare proprietà
- Cercare proprietà
- Ottenere dettagli

❌ **Cosa NON puoi fare:**
- Upload di immagini (usa Postman per questo)

📖 **Come usare:**
1. Apri `test/property-service.http`
2. Modifica `test/http-client.env.json` con i tuoi dati:
   ```json
   {
     "dev": {
       "jwt_token": "IL_TUO_TOKEN_JWT",
       "property_id": "UUID_PROPRIETÀ",
       "base_url": "http://localhost:3002"
     }
   }
   ```
3. Clicca sul pulsante ▶️ verde accanto alla richiesta
4. Oppure usa `Ctrl + Enter` (Windows) / `⌘ + Enter` (Mac)

📖 **Guida completa:** `docs/WEBSTORM_HTTP_CLIENT_GUIDE.md`

---

### 3️⃣ cURL (Da Terminale)

✅ **Vantaggi:**
- Supporto completo per upload
- Funziona ovunque
- Facilmente scriptabile

**Esempio comando:**
```bash
curl -X POST "http://localhost:3002/api/properties/{propertyId}/images" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@C:/path/to/image1.jpg" \
  -F "images=@C:/path/to/image2.jpg" \
  -F 'metadata=[{"isPrimary":true,"order":0},{"isPrimary":false,"order":1}]'
```

---

## 🎯 Configurazione Port

⚠️ **IMPORTANTE:** Nota che il Property Service gira su porta **3002**, non 3001!

Verifica il file di configurazione per assicurarti che il server sia in ascolto sulla porta corretta.

**In http-client.env.json, usa:**
```json
{
  "dev": {
    "base_url": "http://localhost:3002"
  }
}
```

**In Postman, l'URL deve essere:**
```
http://localhost:3002/api/properties/{propertyId}/images
```

---

## 📚 Documentazione Completa

Per maggiori dettagli, consulta:

1. **API Specification:** `docs/API_UPLOAD_PROPERTY_IMAGES.md`
   - Architettura completa
   - Validazioni dettagliate
   - Esempi di request/response

2. **Guida Postman:** `docs/POSTMAN_UPLOAD_IMAGES_GUIDE.md`
   - Configurazione step-by-step
   - Esempi di metadata
   - Troubleshooting

3. **Guida WebStorm:** `docs/WEBSTORM_HTTP_CLIENT_GUIDE.md`
   - Come usare file .http
   - Configurazione environment
   - Limitazioni e alternative

4. **Swagger UI:** http://localhost:3002/api-docs
   - Documentazione interattiva
   - Prova le API direttamente dal browser

---

## 🔐 Ottenere il JWT Token

Per testare le API autenticate, hai bisogno di un JWT token:

1. **Fai login** tramite l'API di autenticazione
2. **Copia il token** dalla risposta
3. **Usalo** nelle richieste con header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

---

## ✨ Validazioni Chiave

Quando fai l'upload di immagini, ricorda:

### File:
- ✅ Formati: JPEG, PNG, WebP
- ✅ Max 10MB per file
- ✅ Max 10000x10000 pixel
- ✅ Max 10 file totali

### Metadata:
- ✅ Un oggetto metadata per ogni file
- ✅ Solo UNA immagine con `isPrimary: true`
- ✅ `order` deve essere univoco (0-99)
- ✅ `caption` max 500 caratteri (opzionale)
- ✅ `altText` max 255 caratteri (opzionale)

---

## 🎉 Riepilogo

**Per upload immagini:** Usa **Postman** (più facile e funziona perfettamente)

**Per altre API:** Usa **WebStorm HTTP Client** (comodo e integrato nell'IDE)

**Per scripting:** Usa **cURL** (potente e flessibile)

Buon testing! 🚀

