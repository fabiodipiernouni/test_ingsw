import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SavedSearchFilters } from './SavedSearchFilters';

export class SavedSearchCreateDto {
  @IsString({ message: 'Il nome della ricerca deve essere una stringa' })
  @IsNotEmpty({ message: 'Il nome della ricerca è obbligatorio' })
  name: string;

  @ValidateNested({ message: 'I filtri della ricerca salvata non sono validi' })
  @Type(() => SavedSearchFilters)
  filters: SavedSearchFilters;
}
