# 🚀 Quick Start - Debug in WebStorm

## ⚡ Procedura Veloce (2 Passi - METODO FUNZIONANTE)

### ⚠️ SE VEDI "ERR_CONNECTION_REFUSED"
Il server non è partito! Segui questa procedura:

### 1️⃣ AVVIA IL SERVER
- Seleziona: **"Angular CLI Server"**
- Clicca Run ▶️
- **ASPETTA** che appaia "Local: http://localhost:4200/"

### 2️⃣ AVVIA IL DEBUGGER
- Seleziona: **"Debug in Chrome"**  
- Clicca Debug 🐛
- Chrome si aprirà connesso al debugger

---

## ❌ METODO ALTERNATIVO (compound - potrebbe non funzionare)

### 1️⃣ FERMA tutto
Premi `Ctrl + F2` o clicca Stop ⬛ se c'è qualcosa in esecuzione

### 2️⃣ Seleziona la configurazione
In alto a destra, nel dropdown seleziona: **Debug Angular App**

### 3️⃣ Clicca DEBUG
Clicca il pulsante verde con l'insetto 🐛 (NON il play ▶️)
- Se Chrome dice "ERR_CONNECTION_REFUSED" → Usa il metodo in 2 passi sopra!

---

## ✅ Cosa Succederà

1. Il server Angular si avvierà
2. Chrome si aprirà automaticamente a http://localhost:4200
3. I tuoi breakpoint funzioneranno! ✨

---

## 🎯 Metti un Breakpoint

1. Apri il file TypeScript (es. search.ts)
2. Clicca sul margine sinistro della riga dove vuoi fermarti
3. Apparirà un pallino rosso 🔴
4. Usa l'app e quando arriva a quella riga si fermerà!

---

## ⚠️ SE NON FUNZIONA

### Il breakpoint ha un punto interrogativo ❓
→ **Aspetta 5-10 secondi** che Chrome carichi i source maps
→ Se persiste, **ricarica la pagina** (F5)

### Il breakpoint è barrato ⛔
→ **Hai usato Run invece di Debug**: ricomincia dal passo 1

### Chrome non si apre
→ **Aprilo manualmente** e vai a http://localhost:4200

---

## 📍 Esempio con search.ts linea 62

```typescript
// Metti il breakpoint qui (click sul margine sinistro)
searchResult = signal<PagedResult<PropertyCardDto> | null>(null);  // 🔴 Breakpoint
```

Quando Angular carica il componente Search, il debugger si fermerà qui!

---

## 🔍 Comandi Debug Utili

- **F9** - Continua (Resume)
- **F8** - Esegui questa riga (Step Over)  
- **F7** - Entra nella funzione (Step Into)
- **Alt+F9** - Valuta espressione

---

**Per dettagli completi**: vedi `DEBUG_GUIDE.md`

