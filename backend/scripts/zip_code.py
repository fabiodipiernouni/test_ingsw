import requests
from typing import Optional, Dict, Any
import time
from pathlib import Path
import json

def _get_cap_nominatim(latitude: float, longitude: float) -> Optional[str]:
    url = "https://nominatim.openstreetmap.org/reverse"
    
    params = {
        'lat': latitude,
        'lon': longitude,
        'format': 'json',
        'addressdetails': 1,
        'zoom': 18
    }
    
    headers = {
        'User-Agent': 'CAP-Lookup-App/1.0'
    }
    
    try:
        # Rispetta il rate limit (1 req/sec)
        time.sleep(1)
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Estrai il CAP dall'indirizzo
        if 'address' in data:
            return data['address'].get('postcode')
        
        return None
        
    except requests.RequestException as e:
        print(f"Errore nella richiesta a Nominatim: {e}")
        return None

if __name__ == "__main__":
    path = Path(__file__).parent / "PROPERTIES.json"
    query_upd = ""
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
        for entry in data:
            geolocation = entry.get("GEO_LOCATION", {})
            if geolocation:
                geolocation = json.loads(entry["GEO_LOCATION"])
                geolocation = geolocation.get("coordinates")
                lat = geolocation[1] if geolocation else None
                lon = geolocation[0] if geolocation else None
                if lat is not None and lon is not None:
                    zip_code = _get_cap_nominatim(lat, lon)
                    print(f"Lat: {lat}, Lon: {lon} => ZIP_CODE: {zip_code}")
                    query_upd += f"UPDATE properties SET ZIP_CODE = '{zip_code}' WHERE ID = '{entry['ID']}';\n"

    file_upd = Path(__file__).parent / "update_cap.sql"
    with file_upd.open('w', encoding='utf-8') as f:
        f.write(query_upd)