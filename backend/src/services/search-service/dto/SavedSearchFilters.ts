import { IsOptional, ValidateNested, IsUUID, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchPropertiesFilters } from './SearchPropertiesFilters';
import { GeoSearchPropertiesFilters } from './GeoSearchPropertiesFilters';
import { PROPERTY_STATUS, PropertyStatus } from '@services/property-service/models/types';

export class SavedSearchFilters {
  @IsOptional()
  @ValidateNested({ message: 'I filtri di ricerca non sono validi' })
  @Type(() => SearchPropertiesFilters)
  filters?: SearchPropertiesFilters;

  @IsOptional()
  @ValidateNested({ message: 'I filtri geografici non sono validi' })
  @Type(() => GeoSearchPropertiesFilters)
  geoFilters?: GeoSearchPropertiesFilters;

  @IsOptional()
  @IsIn(PROPERTY_STATUS, { 
    message: 'Lo stato deve essere uno tra: ' + PROPERTY_STATUS.join(', ') 
  })
  status?: PropertyStatus;

  @IsOptional()
  @IsUUID('4', { message: 'L\'ID dell\'agenzia deve essere un UUID valido' })
  agencyId?: string;

  @IsString({ message: 'Il campo di ordinamento deve essere una stringa' })
  sortBy: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { 
    message: 'L\'ordine deve essere ASC o DESC' 
  })
  sortOrder: 'ASC' | 'DESC';
}
