import fs from 'fs';
import path from 'path';

// Tipi di contratto
const tipiContratto = {
    vendita: 1,
    affitto: 2
};

// Mappa delle province italiane organizzate per regione
const province = {
    'abruzzo': [
        { nome: 'chieti', codice: 'CH', regione: 'abr' },
        { nome: 'laquila', codice: 'AQ', regione: 'abr' },
        { nome: 'pescara', codice: 'PE', regione: 'abr' },
        { nome: 'teramo', codice: 'TE', regione: 'abr' }
    ],
    'basilicata': [
        { nome: 'matera', codice: 'MT', regione: 'bas' },
        { nome: 'potenza', codice: 'PZ', regione: 'bas' }
    ],
    'calabria': [
        { nome: 'catanzaro', codice: 'CZ', regione: 'cal' },
        { nome: 'cosenza', codice: 'CS', regione: 'cal' },
        { nome: 'crotone', codice: 'KR', regione: 'cal' },
        { nome: 'reggio-calabria', codice: 'RC', regione: 'cal' },
        { nome: 'vibo-valentia', codice: 'VV', regione: 'cal' }
    ],
    'campania': [
        { nome: 'avellino', codice: 'AV', regione: 'cam' },
        { nome: 'benevento', codice: 'BN', regione: 'cam' },
        { nome: 'caserta', codice: 'CE', regione: 'cam' },
        { nome: 'napoli', codice: 'NA', regione: 'cam' },
        { nome: 'salerno', codice: 'SA', regione: 'cam' }
    ],
    'emilia-romagna': [
        { nome: 'bologna', codice: 'BO', regione: 'emi' },
        { nome: 'ferrara', codice: 'FE', regione: 'emi' },
        { nome: 'forli-cesena', codice: 'FC', regione: 'emi' },
        { nome: 'modena', codice: 'MO', regione: 'emi' },
        { nome: 'parma', codice: 'PR', regione: 'emi' },
        { nome: 'piacenza', codice: 'PC', regione: 'emi' },
        { nome: 'ravenna', codice: 'RA', regione: 'emi' },
        { nome: 'reggio-emilia', codice: 'RE', regione: 'emi' },
        { nome: 'rimini', codice: 'RN', regione: 'emi' }
    ],
    'friuli-venezia-giulia': [
        { nome: 'gorizia', codice: 'GO', regione: 'fri' },
        { nome: 'pordenone', codice: 'PN', regione: 'fri' },
        { nome: 'trieste', codice: 'TS', regione: 'fri' },
        { nome: 'udine', codice: 'UD', regione: 'fri' }
    ],
    'lazio': [
        { nome: 'frosinone', codice: 'FR', regione: 'laz' },
        { nome: 'latina', codice: 'LT', regione: 'laz' },
        { nome: 'rieti', codice: 'RI', regione: 'laz' },
        { nome: 'roma', codice: 'RM', regione: 'laz' },
        { nome: 'viterbo', codice: 'VT', regione: 'laz' }
    ],
    'liguria': [
        { nome: 'genova', codice: 'GE', regione: 'lig' },
        { nome: 'imperia', codice: 'IM', regione: 'lig' },
        { nome: 'la-spezia', codice: 'SP', regione: 'lig' },
        { nome: 'savona', codice: 'SV', regione: 'lig' }
    ],
    'lombardia': [
        { nome: 'bergamo', codice: 'BG', regione: 'lom' },
        { nome: 'brescia', codice: 'BS', regione: 'lom' },
        { nome: 'como', codice: 'CO', regione: 'lom' },
        { nome: 'cremona', codice: 'CR', regione: 'lom' },
        { nome: 'lecco', codice: 'LC', regione: 'lom' },
        { nome: 'lodi', codice: 'LO', regione: 'lom' },
        { nome: 'mantova', codice: 'MN', regione: 'lom' },
        { nome: 'milano', codice: 'MI', regione: 'lom' },
        { nome: 'monza-brianza', codice: 'MB', regione: 'lom' },
        { nome: 'pavia', codice: 'PV', regione: 'lom' },
        { nome: 'sondrio', codice: 'SO', regione: 'lom' },
        { nome: 'varese', codice: 'VA', regione: 'lom' }
    ],
    'marche': [
        { nome: 'ancona', codice: 'AN', regione: 'mar' },
        { nome: 'ascoli-piceno', codice: 'AP', regione: 'mar' },
        { nome: 'fermo', codice: 'FM', regione: 'mar' },
        { nome: 'macerata', codice: 'MC', regione: 'mar' },
        { nome: 'pesaro-urbino', codice: 'PU', regione: 'mar' }
    ],
    'molise': [
        { nome: 'campobasso', codice: 'CB', regione: 'mol' },
        { nome: 'isernia', codice: 'IS', regione: 'mol' }
    ],
    'piemonte': [
        { nome: 'alessandria', codice: 'AL', regione: 'pie' },
        { nome: 'asti', codice: 'AT', regione: 'pie' },
        { nome: 'biella', codice: 'BI', regione: 'pie' },
        { nome: 'cuneo', codice: 'CN', regione: 'pie' },
        { nome: 'novara', codice: 'NO', regione: 'pie' },
        { nome: 'torino', codice: 'TO', regione: 'pie' },
        { nome: 'verbano-cusio-ossola', codice: 'VB', regione: 'pie' },
        { nome: 'vercelli', codice: 'VC', regione: 'pie' }
    ],
    'puglia': [
        { nome: 'bari', codice: 'BA', regione: 'pug' },
        { nome: 'barletta-andria-trani', codice: 'BT', regione: 'pug' },
        { nome: 'brindisi', codice: 'BR', regione: 'pug' },
        { nome: 'foggia', codice: 'FG', regione: 'pug' },
        { nome: 'lecce', codice: 'LE', regione: 'pug' },
        { nome: 'taranto', codice: 'TA', regione: 'pug' }
    ],
    'sardegna': [
        { nome: 'cagliari', codice: 'CA', regione: 'sar' },
        { nome: 'nuoro', codice: 'NU', regione: 'sar' },
        { nome: 'oristano', codice: 'OR', regione: 'sar' },
        { nome: 'sassari', codice: 'SS', regione: 'sar' },
        { nome: 'sud-sardegna', codice: 'SU', regione: 'sar' }
    ],
    'sicilia': [
        { nome: 'agrigento', codice: 'AG', regione: 'sic' },
        { nome: 'caltanissetta', codice: 'CL', regione: 'sic' },
        { nome: 'catania', codice: 'CT', regione: 'sic' },
        { nome: 'enna', codice: 'EN', regione: 'sic' },
        { nome: 'messina', codice: 'ME', regione: 'sic' },
        { nome: 'palermo', codice: 'PA', regione: 'sic' },
        { nome: 'ragusa', codice: 'RG', regione: 'sic' },
        { nome: 'siracusa', codice: 'SR', regione: 'sic' },
        { nome: 'trapani', codice: 'TP', regione: 'sic' }
    ],
    'toscana': [
        { nome: 'arezzo', codice: 'AR', regione: 'tos' },
        { nome: 'firenze', codice: 'FI', regione: 'tos' },
        { nome: 'grosseto', codice: 'GR', regione: 'tos' },
        { nome: 'livorno', codice: 'LI', regione: 'tos' },
        { nome: 'lucca', codice: 'LU', regione: 'tos' },
        { nome: 'massa-carrara', codice: 'MS', regione: 'tos' },
        { nome: 'pisa', codice: 'PI', regione: 'tos' },
        { nome: 'pistoia', codice: 'PT', regione: 'tos' },
        { nome: 'prato', codice: 'PO', regione: 'tos' },
        { nome: 'siena', codice: 'SI', regione: 'tos' }
    ],
    'trentino-alto-adige': [
        { nome: 'bolzano', codice: 'BZ', regione: 'tre' },
        { nome: 'trento', codice: 'TN', regione: 'tre' }
    ],
    'umbria': [
        { nome: 'perugia', codice: 'PG', regione: 'umb' },
        { nome: 'terni', codice: 'TR', regione: 'umb' }
    ],
    'valle-d-aosta': [
        { nome: 'aosta', codice: 'AO', regione: 'val' }
    ],
    'veneto': [
        { nome: 'belluno', codice: 'BL', regione: 'ven' },
        { nome: 'padova', codice: 'PD', regione: 'ven' },
        { nome: 'rovigo', codice: 'RO', regione: 'ven' },
        { nome: 'treviso', codice: 'TV', regione: 'ven' },
        { nome: 'venezia', codice: 'VE', regione: 'ven' },
        { nome: 'verona', codice: 'VR', regione: 'ven' },
        { nome: 'vicenza', codice: 'VI', regione: 'ven' }
    ]
};

async function scrapeProvinciaData(provincia: any, regioneNome: string, tipoContratto: keyof typeof tipiContratto) {
    const idContratto = tipiContratto[tipoContratto];
    const pathContratto = tipoContratto === 'vendita' ? 'vendita-case' : 'affitto-case';
    
    const baseUrl = `https://www.immobiliare.it/api-next/search-list/listings/?fkRegione=${provincia.regione}&idProvincia=${provincia.codice}&idNazione=IT&__lang=it&idContratto=${idContratto}&idCategoria=1&path=%2F${pathContratto}%2F${provincia.nome}-provincia%2F`;
    
    // Crea la directory per la provincia e tipo contratto se non esiste
    const provinciaDir = path.join(__dirname, '..', 'data', regioneNome, provincia.nome, tipoContratto);
    if (!fs.existsSync(provinciaDir)) {
        fs.mkdirSync(provinciaDir, { recursive: true });
    }

    console.log(`\n🏘️ Inizio scraping ${tipoContratto.toUpperCase()} per ${provincia.nome.toUpperCase()} (${provincia.codice})`);
    let pagineSalvate = 0;

    for (let page = 1; page <= 80; page++) {
        const url = `${baseUrl}&pag=${page}`;
        
        try {
            console.log(`📄 ${tipoContratto} - ${provincia.nome} - Pagina ${page}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
                    'Referer': 'https://www.immobiliare.it/',
                }
            });

            if (response.status !== 200) {
                console.error(`❌ ${provincia.nome} - Errore HTTP sulla pagina ${page}: status ${response.status}`);
                console.log(`🛑 ${provincia.nome} - Scraping interrotto alla pagina ${page}`);
                break;
            }

            const data = await response.json();
            
            // Salva i dati nel file JSON
            const filename = `${page}.json`;
            const filepath = path.join(provinciaDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
            
            pagineSalvate++;
            console.log(`✅ ${tipoContratto} - ${provincia.nome} - Pagina ${page} salvata.`);

            // Pausa di 300ms tra le richieste per non sovraccaricare il server
            await new Promise(resolve => setTimeout(resolve, 300));
            
        } catch (error) {
            console.error(`❌ ${provincia.nome} - Errore durante il scraping della pagina ${page}:`, error);
            console.log(`🛑 ${provincia.nome} - Scraping interrotto alla pagina ${page}`);
            break;
        }
    }
    
    console.log(`🎉 ${tipoContratto.toUpperCase()} - ${provincia.nome.toUpperCase()} completata: ${pagineSalvate} pagine salvate`);
    return pagineSalvate;
}

async function scrapeAllProvince() {
    console.log('🚀 Inizio scraping di tutte le province italiane per vendita e affitto...\n');
    
    let totalePagine = 0;
    let totaleProvince = 0;
    
    // Loop per entrambi i tipi di contratto
    for (const tipoContratto of Object.keys(tipiContratto) as Array<keyof typeof tipiContratto>) {
        console.log(`\n💼 === TIPO CONTRATTO: ${tipoContratto.toUpperCase()} ===\n`);
        
        for (const [regioneNome, provinceRegione] of Object.entries(province)) {
            console.log(`\n🌍 === REGIONE: ${regioneNome.toUpperCase()} - ${tipoContratto.toUpperCase()} ===`);
            
            for (const provincia of provinceRegione) {
                try {
                    const pagineProvincia = await scrapeProvinciaData(provincia, regioneNome, tipoContratto);
                    totalePagine += pagineProvincia;
                    totaleProvince++;
                    
                    // Pausa tra le province
                    console.log(`⏳ Pausa di 1 secondo prima della prossima provincia...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`💥 Errore durante lo scraping di ${provincia.nome} (${tipoContratto}):`, error);
                    console.log('🔄 Continuo con la prossima provincia...');
                }
            }
            
            // Pausa più lunga tra le regioni
            console.log(`⏳ Pausa di 3 secondi prima della prossima regione...\n`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log(`\n🎯 SCRAPING COMPLETATO!`);
    console.log(`📊 Totale pagine salvate: ${totalePagine}`);
    console.log(`🏘️ Province processate (vendita + affitto): ${totaleProvince}`);
    console.log(`🌍 Regioni processate: ${Object.keys(province).length}`);
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
    scrapeAllProvince()
        .then(() => console.log('🏁 Script completato con successo'))
        .catch(error => {
            console.error('💀 Script fallito:', error);
            process.exit(1);
        });
}

export { scrapeProvinciaData, scrapeAllProvince };