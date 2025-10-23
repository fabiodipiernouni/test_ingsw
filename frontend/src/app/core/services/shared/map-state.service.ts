import { Injectable } from '@angular/core';
import { GetPropertiesCardsRequest } from '@core/services/property/dto/GetPropertiesCardsRequest';

interface MapState {
  center?: { lat: number; lng: number };
  zoom?: number;
  viewMode: 'list' | 'map' | 'split';
  showMap: boolean;
  filters: GetPropertiesCardsRequest;
}

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private mapState: MapState | null = null;

  saveState(state: MapState): void {
    this.mapState = state;
    console.log('💾 Stato mappa salvato:', state);
  }

  getState(): MapState | null {
    return this.mapState;
  }

  clearState(): void {
    this.mapState = null;
  }

  hasState(): boolean {
    return this.mapState !== null;
  }
}

