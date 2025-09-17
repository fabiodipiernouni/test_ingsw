import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, tap, delay } from 'rxjs/operators';
import { Property, PropertyStats } from '../models/property.model';
import { SearchFilters, SearchResult } from '../models/search.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8080/api/properties';

  // Reactive state
  private propertiesSubject = new BehaviorSubject<Property[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  properties = signal<Property[]>([]);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);

  // Mock data for development
  private mockProperties: Property[] = [
    {
      id: '1',
      title: 'Splendido Appartamento Ristrutturato',
      description: 'Magnifico appartamento completamente ristrutturato nel cuore del Vomero...',
      price: 285000,
      propertyType: 'apartment',
      listingType: 'sale',
      bedrooms: 3,
      bathrooms: 2,
      area: 95,
      floor: '2° piano',
      energyClass: 'A',
      hasElevator: true,
      hasBalcony: true,
      hasGarden: false,
      hasParking: false,
      address: {
        street: 'Via Scarlatti 150',
        city: 'Napoli',
        province: 'NA',
        zipCode: '80127',
        country: 'Italia'
      },
      location: {
        latitude: 40.8359,
        longitude: 14.2394
      },
      images: [
        {
          id: '1',
          url: '/assets/images/property1-1.jpg',
          alt: 'Soggiorno principale',
          isPrimary: true,
          order: 1
        }
      ],
      agentId: 'agent1',
      isActive: true,
      views: 245,
      favorites: 18,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Villa con Giardino e Vista Mare',
      description: 'Esclusiva villa su due livelli con giardino privato e vista mozzafiato sul golfo...',
      price: 450000,
      propertyType: 'villa',
      listingType: 'sale',
      bedrooms: 4,
      bathrooms: 3,
      area: 180,
      energyClass: 'B',
      hasElevator: false,
      hasBalcony: true,
      hasGarden: true,
      hasParking: true,
      address: {
        street: 'Via Posillipo 45',
        city: 'Napoli',
        province: 'NA',
        zipCode: '80123',
        country: 'Italia'
      },
      location: {
        latitude: 40.8088,
        longitude: 14.1972
      },
      images: [
        {
          id: '2',
          url: '/assets/images/property2-1.jpg',
          alt: 'Vista esterna',
          isPrimary: true,
          order: 1
        }
      ],
      agentId: 'agent2',
      isActive: true,
      views: 189,
      favorites: 32,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    }
  ];

  constructor() {
    this.properties.set(this.mockProperties);
    this.propertiesSubject.next(this.mockProperties);
    this.totalCount.set(this.mockProperties.length);
  }

  searchProperties(filters: SearchFilters, page: number = 1, limit: number = 20): Observable<SearchResult> {
    this.isLoading.set(true);

    // Simulate API call with filtering
    return of(this.mockProperties).pipe(
      map(properties => this.filterProperties(properties, filters)),
      map(filteredProperties => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

        return {
          properties: paginatedProperties,
          totalCount: filteredProperties.length,
          currentPage: page,
          totalPages: Math.ceil(filteredProperties.length / limit),
          hasNextPage: page < Math.ceil(filteredProperties.length / limit),
          hasPreviousPage: page > 1
        };
      }),
      delay(500), // Simulate network delay
      tap(result => {
        this.properties.set(result.properties);
        this.totalCount.set(result.totalCount);
        this.isLoading.set(false);
      })
    );
  }

  getPropertyById(id: string): Observable<Property | null> {
    const property = this.mockProperties.find(p => p.id === id);
    return of(property || null).pipe(delay(200));
  }

  createProperty(propertyData: Partial<Property>): Observable<Property> {
    const newProperty: Property = {
      id: Math.random().toString(36),
      title: propertyData.title || '',
      description: propertyData.description || '',
      price: propertyData.price || 0,
      propertyType: propertyData.propertyType || 'apartment',
      listingType: propertyData.listingType || 'sale',
      bedrooms: propertyData.bedrooms || 1,
      bathrooms: propertyData.bathrooms || 1,
      area: propertyData.area || 50,
      floor: propertyData.floor,
      energyClass: propertyData.energyClass,
      hasElevator: propertyData.hasElevator || false,
      hasBalcony: propertyData.hasBalcony || false,
      hasGarden: propertyData.hasGarden || false,
      hasParking: propertyData.hasParking || false,
      address: propertyData.address || {
        street: '',
        city: '',
        province: '',
        zipCode: '',
        country: 'Italia'
      },
      location: propertyData.location || { latitude: 0, longitude: 0 },
      images: propertyData.images || [],
      agentId: 'current-agent-id',
      isActive: true,
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return of(newProperty).pipe(
      delay(1000),
      tap(property => {
        this.mockProperties.push(property);
        this.properties.update(current => [...current, property]);
        this.totalCount.update(count => count + 1);
      })
    );
  }

  updateProperty(id: string, updates: Partial<Property>): Observable<Property> {
    const index = this.mockProperties.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Property not found');
    }

    const updatedProperty = {
      ...this.mockProperties[index],
      ...updates,
      updatedAt: new Date()
    };

    return of(updatedProperty).pipe(
      delay(500),
      tap(property => {
        this.mockProperties[index] = property;
        this.properties.update(current =>
          current.map(p => p.id === id ? property : p)
        );
      })
    );
  }

  deleteProperty(id: string): Observable<boolean> {
    return of(true).pipe(
      delay(500),
      tap(() => {
        this.mockProperties = this.mockProperties.filter(p => p.id !== id);
        this.properties.update(current => current.filter(p => p.id !== id));
        this.totalCount.update(count => count - 1);
      })
    );
  }

  getPropertyStats(): Observable<PropertyStats> {
    const stats: PropertyStats = {
      totalProperties: this.mockProperties.length,
      propertiesForSale: this.mockProperties.filter(p => p.listingType === 'sale').length,
      propertiesForRent: this.mockProperties.filter(p => p.listingType === 'rent').length,
      averagePrice: this.mockProperties.reduce((sum, p) => sum + p.price, 0) / this.mockProperties.length,
      mostViewedProperties: this.mockProperties
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
    };

    return of(stats).pipe(delay(300));
  }

  toggleFavorite(propertyId: string): Observable<boolean> {
    // Simulate API call to toggle favorite
    return of(true).pipe(delay(200));
  }

  private filterProperties(properties: Property[], filters: SearchFilters): Property[] {
    return properties.filter(property => {
      if (filters.location && !this.matchesLocation(property, filters.location)) {
        return false;
      }

      if (filters.propertyType && property.propertyType !== filters.propertyType) {
        return false;
      }

      if (filters.listingType && property.listingType !== filters.listingType) {
        return false;
      }

      if (filters.priceMin && property.price < filters.priceMin) {
        return false;
      }

      if (filters.priceMax && property.price > filters.priceMax) {
        return false;
      }

      if (filters.bedrooms && property.bedrooms < filters.bedrooms) {
        return false;
      }

      if (filters.bathrooms && property.bathrooms < filters.bathrooms) {
        return false;
      }

      if (filters.areaMin && property.area < filters.areaMin) {
        return false;
      }

      if (filters.areaMax && property.area > filters.areaMax) {
        return false;
      }

      if (filters.energyClass && property.energyClass !== filters.energyClass) {
        return false;
      }

      if (filters.hasElevator !== undefined && property.hasElevator !== filters.hasElevator) {
        return false;
      }

      if (filters.hasBalcony !== undefined && property.hasBalcony !== filters.hasBalcony) {
        return false;
      }

      if (filters.hasGarden !== undefined && property.hasGarden !== filters.hasGarden) {
        return false;
      }

      if (filters.hasParking !== undefined && property.hasParking !== filters.hasParking) {
        return false;
      }

      return true;
    });
  }

  private matchesLocation(property: Property, location: string): boolean {
    const searchLocation = location.toLowerCase();
    return property.address.city.toLowerCase().includes(searchLocation) ||
      property.address.street.toLowerCase().includes(searchLocation) ||
      property.address.province.toLowerCase().includes(searchLocation);
  }
}
