import fs from 'fs';
import path from 'path';

// Tipi di contratto
const tipiContratto = {
    vendita: 1,
    affitto: 2
};

// Regioni italiane
const regioni = [
    'abruzzo', 'basilicata', 'calabria', 'campania', 'emilia-romagna',
    'friuli-venezia-giulia', 'lazio', 'liguria', 'lombardia', 'marche',
    'molise', 'piemonte', 'puglia', 'sardegna', 'sicilia', 'toscana',
    'trentino-alto-adige', 'umbria', 'valle-d-aosta', 'veneto'
]

async function scrapeRegione(regione: string, tipoContratto: keyof typeof tipiContratto, numPagine: number = 80) {
    const idContratto = tipiContratto[tipoContratto];
    const pathContratto = tipoContratto === 'vendita' ? 'vendita-case' : 'affitto-case';
    
    const baseUrl = `https://www.immobiliare.it/api-next/search-list/listings/?fkRegione=${regione.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3)}&idNazione=IT&__lang=it&idContratto=${idContratto}&idCategoria=1&path=%2F${pathContratto}%2F${regione}%2F`;
    // Crea la directory per la provincia e tipo contratto se non esiste
    const regioneDir = path.join(__dirname, '..', 'data', regione, tipoContratto);
    if (!fs.existsSync(regioneDir)) {
        fs.mkdirSync(regioneDir, { recursive: true });
    }

    console.log(`\nInizio scraping ${tipoContratto} per ${regione} (${regione})`);
    let pagineSalvate = 0;

    for (let page = 1; page <= numPagine; page++) {
        const url = `${baseUrl}&pag=${page}`;
        
        try {
            console.log(`📄 ${tipoContratto} - ${regione} - Pagina ${page}`);

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
                console.error(`${regione} - Errore HTTP sulla pagina ${page}: status ${response.status}`);
                console.log(`${regione} - Scraping interrotto alla pagina ${page}`);
                break;
            }

            const data = await response.json();
            
            // Salva i dati nel file JSON
            const filename = `${page}.json`;
            const filepath = path.join(regioneDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
            
            pagineSalvate++;
            console.log(`${tipoContratto} - ${regione} - Pagina ${page} salvata.`);

            // Pausa di 300ms tra le richieste per non sovraccaricare il server
            await new Promise(resolve => setTimeout(resolve, 300));
            
        } catch (error) {
            console.error(`${regione} - Errore durante il scraping della pagina ${page}:`, error);
            console.log(`${regione} - Scraping interrotto alla pagina ${page}`);
            break;
        }
    }

    console.log(`${tipoContratto} - ${regione} completata: ${pagineSalvate} pagine salvate`);
    return pagineSalvate;
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
    const jobs = regioni.flatMap(regione => {
        let numPagine = 1;

        return [
            scrapeRegione(regione, 'vendita', numPagine),
            scrapeRegione(regione, 'affitto', numPagine)
        ];
    });

    Promise.all(jobs)
        .then(() => console.log('Script completato con successo'))
        .catch(error => {
            console.error('Script fallito:', error);
            process.exit(1);
        });
}