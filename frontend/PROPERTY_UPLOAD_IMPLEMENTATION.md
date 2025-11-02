# Implementazione Nuovo Flusso API - Property Upload

## Modifiche Implementate

### 1. DTO Creati

#### CreatePropertyRequest.ts
- DTO per la creazione di proprietà secondo OpenAPI
- Campi richiesti: title, description, price, propertyType, listingType, bedrooms, bathrooms, area, address, location
- Campi opzionali: floor, energyClass, hasElevator, hasBalcony, hasGarden, hasParking, features
- Location in formato GeoJSON Point: `{ type: 'Point', coordinates: [lng, lat] }`

#### ImageMetadataDto.ts
- DTO per metadata delle immagini
- Campi richiesti: isPrimary, order
- Campi opzionali: caption, altText

### 2. PropertyService Aggiornato

#### Metodo `createProperty()`
- Firma: `createProperty(propertyData: CreatePropertyRequest): Observable<PropertyModel>`
- Endpoint: `POST /api/properties`

#### Metodo `uploadImages()`
- Firma: `uploadImages(propertyId: string, images: File[], metadata: ImageMetadataDto[]): Observable<PropertyImageModel[]>`
- Endpoint: `POST /api/properties/{propertyId}/images`
- Invia FormData con:
  - `images`: array di file
  - `metadata`: JSON stringificato con ImageMetadataDto[]

#### Metodo `setPrimaryImage()`
- **Mantenuto** per uso futuro in fase di modifica proprietà
- Endpoint: `PATCH /api/properties/{propertyId}/images/{imageId}/primary`

### 3. PropertyUpload Component Aggiornato

#### Nuovo Flusso `onSubmit()`:

```
1. Validazione form e location
   ↓
2. POST /api/properties → Crea proprietà
   ↓
3. POST /api/properties/{id}/images → Upload immagini (se presenti)
   - Metadata include isPrimary per indicare l'immagine principale
   ↓
4. Navigate to /properties/{id}
```

#### Dettagli Implementazione:
- Costruisce `CreatePropertyRequest` con tutti i campi richiesti
- Location convertita da `{lat, lng}` a GeoJSON `{type: 'Point', coordinates: [lng, lat]}`
- Metadata costruiti da `ImagePreview[]` includendo `isPrimary` e `order`
- Gestione errori con fallback (proprietà creata anche se upload immagini fallisce)

### 4. Rimozione Logica Obsoleta

**RIMOSSO**: Il passaggio di impostazione primaria dopo upload:
```typescript
// VECCHIO FLUSSO (rimosso)
uploadImages() → setPrimaryImage() → navigate
```

**NUOVO FLUSSO**:
```typescript
uploadImages(files, metadata) → navigate
// isPrimary è incluso nei metadata
```

### 5. Conformità OpenAPI

✅ Address: Utilizza interfaccia esistente in `@service-shared/models/Address`
✅ GeoJSONPoint: Utilizza interfaccia esistente in `@service-shared/types/geojson.types`
✅ CreatePropertyRequest: Nuovo DTO conforme a schema OpenAPI
✅ ImageMetadataDto: Nuovo DTO conforme a schema OpenAPI
✅ UploadImagesRequest: Implementato tramite FormData con metadata JSON

## Test da Eseguire

1. ✅ Creazione proprietà senza immagini
2. ✅ Creazione proprietà con immagini (isPrimary impostato)
3. ✅ Verifica che metadata vengano inviati correttamente
4. ⚠️ Navigazione dopo creazione a `/properties/{id}`
5. ⚠️ Gestione errori upload immagini (proprietà creata comunque)

## Note Importanti

- **setPrimaryImage()** è mantenuto nel service per utilizzo futuro in modifica proprietà
- Il flusso è ora più semplice e conforme alle specifiche API
- L'ordine delle coordinate GeoJSON è **[longitude, latitude]**
- Il metadata viene inviato come JSON stringificato nel FormData

