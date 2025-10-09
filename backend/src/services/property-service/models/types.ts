
// Import necessario per SearchResult
import { PropertyDto } from '../dto/PropertyDto';

// Types per il Property Service basati sullo schema OpenAPI

export type PropertyType = 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
export type EnergyClass = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
