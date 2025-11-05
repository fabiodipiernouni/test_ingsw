import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { PropertyImageMetadata } from '../dto/addPropertyImageEndpoint/PropertyImageMetadata';
import { PropertyImageFileRequest } from '@property/dto/addPropertyImageEndpoint/PropertyImageFileRequest';

/**
 * Validator constraint per verificare che ci sia al massimo un'immagine primaria
 */
@ValidatorConstraint({ name: 'OnlyOnePrimary', async: false })
export class OnlyOnePrimaryConstraint implements ValidatorConstraintInterface {
  validate(propertyImages: PropertyImageFileRequest[], _args: ValidationArguments) {
    if (!Array.isArray(propertyImages)) {
      return true; // Lascia che @IsArray gestisca questo
    }

    const primaryCount = propertyImages.filter(m => m.metadata.isPrimary).length;
    return primaryCount <= 1;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Only one image can be marked as primary';
  }
}

/**
 * Decorator per validare che ci sia al massimo un'immagine primaria
 */
export function OnlyOnePrimary(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: OnlyOnePrimaryConstraint
    });
  };
}

/**
 * Validator constraint per verificare che gli ordini siano univoci
 */
@ValidatorConstraint({ name: 'UniqueOrders', async: false })
export class UniqueOrdersConstraint implements ValidatorConstraintInterface {
  validate(propertyImages: PropertyImageFileRequest[], _args: ValidationArguments) {
    if (!Array.isArray(propertyImages)) {
      return true; // Lascia che @IsArray gestisca questo
    }

    const orders = propertyImages.map(m => m.metadata.order);
    const uniqueOrders = new Set(orders); //faccio la distinct per poi confrontare le lunghezze
    return orders.length === uniqueOrders.size;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Each image must have a unique order value';
  }
}

/**
 * Decorator per validare che gli ordini siano univoci
 */
export function UniqueOrders(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: UniqueOrdersConstraint
    });
  };
}

