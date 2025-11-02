# 🐛 Guida al Debug in WebStorm

## Problema Risolto
I breakpoint non funzionavano perché la configurazione "Angular CLI Server" avvia solo il server npm, senza attivare il debugger del browser.

## ✅ Configurazioni Disponibili

### 1. **Debug Angular App** (CONSIGLIATA) 🎯
   - Configurazione compound che avvia automaticamente:
     - Il server Angular in modalità development
     - Chrome con il debugger attivo
   - I breakpoint funzioneranno correttamente

### 2. **Debug in Chrome** 
   - Avvia solo il debugger Chrome (il server deve essere già attivo)
   - Utile quando il server è già in esecuzione

### 3. **Angular CLI Server**
   - Avvia solo il server (NO debug)
   - Utile per sviluppo senza debugging

## 📋 PROCEDURA CORRETTA PER IL DEBUG

### ⭐ Metodo Raccomandato (Automatico)

1. **FERMA** il server Angular se è già in esecuzione (Ctrl+F2 o Stop in WebStorm)

2. **Seleziona** la configurazione "Debug Angular App" dal dropdown in alto a destra

3. **Clicca** sul pulsante **Debug** 🐛 (NON il pulsante Run)

4. **Aspetta** che:
   - Il server si avvii completamente
   - Chrome si apra automaticamente
   - L'app si carichi

5. **Metti i breakpoint** nei file TypeScript (click sul margine sinistro della riga)

6. **Naviga** nell'applicazione → I breakpoint si fermeranno! ✅

### 🔄 Metodo Manuale (Se il server è già attivo)

1. Il server è già in esecuzione con "Angular CLI Server"

2. Seleziona "Debug in Chrome" dal dropdown

3. Clicca Debug 🐛

4. Chrome si aprirà connesso al debugger

## ⚠️ Problemi Comuni

### ❌ I breakpoint non si fermano

**Causa**: Stai usando "Angular CLI Server" o hai cliccato Run invece di Debug

**Soluzione**:
1. Ferma tutto
2. Usa "Debug Angular App" 
3. Clicca il pulsante **Debug** 🐛 (NON Run ▶️)

### ❌ Breakpoint con icona ❓ o barrati

**Causa**: Il source mapping non ha trovato il file

**Soluzioni**:
- Aspetta qualche secondo che Chrome carichi i source maps
- Ricarica la pagina (F5)
- Verifica che il server sia in modalità development
- Controlla che Chrome DevTools sia aperto

### ❌ Chrome non si apre automaticamente

**Soluzione**:
- Apri manualmente Chrome e vai a http://localhost:4200
- Il debugger si collegherà automaticamente

## ⚙️ Verifiche Effettuate

✅ **Source Maps abilitate** in `angular.json`:
```json
"sourceMap": {
  "scripts": true,
  "styles": true,
  "vendor": true
}
```

✅ **TypeScript sourceMap** abilitata in `tsconfig.json`:
```json
"sourceMap": true
```

✅ **Server in modalità development**

✅ **Configurazioni compound create**

## 💡 Tips Utili

- **Breakpoint condizionali**: Click destro sul breakpoint → Add condition
- **Logpoint**: Click destro sul breakpoint → More → Logpoint (stampa senza fermarsi)
- **Console nel debugger**: Usa la console per valutare espressioni nel contesto attuale
- **Step Over** (F8): Esegue la riga corrente
- **Step Into** (F7): Entra nella funzione
- **Resume** (F9): Continua fino al prossimo breakpoint

## 🔧 Debug Avanzato

### Debug di codice che si esegue all'avvio
La configurazione "Debug in Chrome" ha `useFirstLineBreakpoints="true"` che permette di debuggare codice che si esegue immediatamente al caricamento della pagina.

### Verificare i Source Maps in Chrome
1. Apri Chrome DevTools (F12)
2. Vai su Sources
3. Dovresti vedere la cartella `webpack://` con i file TypeScript originali
4. Se non li vedi, i source maps non sono caricati correttamente

---

**Ultimo aggiornamento**: 2025-11-01
**Configurazioni testate**: ✅ Funzionanti

### I breakpoint sono grigi/disabilitati
- Assicurati di usare la configurazione "Debug Angular App" o "Debug in Chrome"
- Verifica che Chrome si sia aperto con il debugger (dovrebbe esserci una barra gialla in alto)

### I breakpoint non si fermano
1. **Refresh della cache**: Apri DevTools (F12) e fai refresh con Ctrl+Shift+R
2. **Verifica le source maps**: In Chrome DevTools > Sources, controlla che i file TypeScript siano visibili sotto `webpack://`
3. **Riavvia il debug**: Ferma il server e riavvia con il pulsante Debug

### Il browser non si apre automaticamente
- WebStorm dovrebbe aprire Chrome automaticamente
- Se non funziona, apri manualmente Chrome su `http://localhost:4200`
- Assicurati che WebStorm abbia i permessi per aprire applicazioni

## 🎯 Best Practices

1. **Usa sempre "Debug Angular App"** invece di "Angular CLI Server" quando vuoi fare debug
2. **Metti i breakpoint prima di avviare il debug** per codice che si esegue all'avvio
3. **Usa il debugger di WebStorm** invece di `console.log()` - è molto più potente!
4. **Valuta le espressioni** durante il debug cliccando col destro su una variabile > Evaluate Expression

## 📚 Risorse Utili

- [WebStorm Debugging Guide](https://www.jetbrains.com/help/webstorm/debugging-javascript-in-chrome.html)
- [Angular Debugging](https://angular.dev/tools/cli/debugging)

---
✨ Ora il debug dovrebbe funzionare perfettamente! Buon debugging! 🚀

