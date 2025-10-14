import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { setResponseAsValidationError } from '@shared/utils/helpers';
import { plainToClass, plainToInstance } from 'class-transformer';
import { validate as classValidate } from 'class-validator';
import { GetPropertiesCardsRequest } from '../../services/property-service/dto/GetPropertiesCardsRequest';
import { ApiResponse } from '@shared/dto/ApiResponse';



/**
 * Wrapper to apply validation chains and error handling
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const str_errors = Array<string>();
      for (const err of errors.array()) { str_errors.push(err.msg); }
      return setResponseAsValidationError(res, str_errors);
    }
    
    next();
  };
};

/**
 * DTO for property search filters
 * @param req
 * @param res
 * @param next
 */
export const validatePropertySearchFilters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const filters = plainToInstance(GetPropertiesCardsRequest, req.body);
  const errors = await classValidate(filters);

  if (errors.length > 0) {
    const formattedErrors = errors.map(err => ({
      field: err.property,
      errors: Object.values(err.constraints || {})
    }));

    const response: ApiResponse<never> = {
      success: false,
      message: 'Validazione filtri fallita',
      error: 'VALIDATION_ERROR',
      timestamp: new Date(),
      details: formattedErrors.flatMap(e => e.errors),
      path: res.req?.originalUrl || ''
    };

    return res.status(400).json(response);
  }

  req.body = filters; // Sostituisci con l'oggetto validato
  next();
};

/**
 * Validation chains for common fields
 */

export const commonValidations = {
  uuid: (field: string) => 
    param(field).isUUID().withMessage(`${field} must be a valid UUID`),
    
  email: () => 
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    
  password: () => 
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      
  phone: () => 
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Phone number must be valid'),
      
  name: (field: string) => 
    body(field)
      .isLength({ min: 2, max: 50 })
      .trim()
      .escape()
      .withMessage(`${field} must be between 2 and 50 characters`),
      
  pagination: {
    page: () => 
      query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('Page must be a positive integer'),
        
    limit: () => 
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt()
        .withMessage('Limit must be between 1 and 100')
  },
  
  price: () => 
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
      
  coordinates: {
    latitude: () => 
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
        
    longitude: () => 
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
  }
};

/**
 * Property-specific validations
 */
export const propertyValidations = {
  create: [
    body('title')
      .isLength({ min: 10, max: 200 })
      .trim()
      .escape()
      .withMessage('Title must be between 10 and 200 characters'),
      
    body('description')
      .isLength({ min: 50, max: 2000 })
      .trim()
      .escape()
      .withMessage('Description must be between 50 and 2000 characters'),
      
    commonValidations.price(),
    
    body('propertyType')
      .isIn(['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'])
      .withMessage('Invalid property type'),
      
    body('listingType')
      .isIn(['sale', 'rent'])
      .withMessage('Listing type must be either sale or rent'),
      
    body('bedrooms')
      .isInt({ min: 0, max: 20 })
      .withMessage('Bedrooms must be between 0 and 20'),
      
    body('bathrooms')
      .isInt({ min: 0, max: 20 })
      .withMessage('Bathrooms must be between 0 and 20'),
      
    body('area')
      .isFloat({ min: 1, max: 10000 })
      .withMessage('Area must be between 1 and 10000 square meters'),
      
    body('address.street')
      .isLength({ min: 5, max: 200 })
      .trim()
      .escape()
      .withMessage('Street address is required'),
      
    body('address.city')
      .isLength({ min: 2, max: 100 })
      .trim()
      .escape()
      .withMessage('City is required'),
      
    body('address.zipCode')
      .matches(/^\d{5}$/)
      .withMessage('ZIP code must be 5 digits'),
      
    commonValidations.coordinates.latitude(),
    commonValidations.coordinates.longitude()
  ],
  
  update: [
    commonValidations.uuid('propertyId'),
    
    body('title')
      .optional()
      .isLength({ min: 10, max: 200 })
      .trim()
      .escape(),
      
    body('description')
      .optional()
      .isLength({ min: 50, max: 2000 })
      .trim()
      .escape(),
      
    body('price')
      .optional()
      .isFloat({ min: 0 }),
      
    body('status')
      .optional()
      .isIn(['active', 'pending', 'sold', 'rented', 'withdrawn'])
  ]
};

/**
 * Auth-specific validations
 */
export const authValidations = {
  register: [
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    
    commonValidations.phone(),
    
    body('acceptTerms')
      .isBoolean()
      .withMessage('Terms acceptance is required'),
      
    body('acceptPrivacy')
      .isBoolean()
      .withMessage('Privacy acceptance is required')
  ],
  
  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  forgotPassword: [
    commonValidations.email()
  ],
  
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    commonValidations.password()
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage('New password must contain at least one letter and one number')
  ]
};

/**
 * Search-specific validations
 */
export const searchValidations = {
  search: [
    body('location').optional().isLength({ max: 100 }),
    body('propertyType').optional().isIn(['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land']),
    body('listingType').optional().isIn(['sale', 'rent']),
    body('priceMin').optional().isFloat({ min: 0 }),
    body('priceMax').optional().isFloat({ min: 0 }),
    body('bedrooms').optional().isInt({ min: 0, max: 20 }),
    body('bathrooms').optional().isInt({ min: 0, max: 20 }),
    body('areaMin').optional().isFloat({ min: 0 }),
    body('areaMax').optional().isFloat({ min: 0 }),
    body('radius').optional().isFloat({ min: 0.1, max: 100 }),
    commonValidations.pagination.page(),
    commonValidations.pagination.limit()
  ],
  
  savedSearch: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .trim()
      .escape()
      .withMessage('Search name is required'),
      
    body('filters').isObject().withMessage('Filters must be an object')
  ]
};

/**
 * User management validations
 */
export const userValidations = {
  createAgent: [
    commonValidations.email(),
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    commonValidations.phone(),
    
    body('licenseNumber')
      .isLength({ min: 5, max: 50 })
      .trim()
      .escape()
      .withMessage('License number is required for agents'),
      
    body('biography')
      .optional()
      .isLength({ max: 1000 })
      .trim()
      .escape(),
      
    body('specializations')
      .optional()
      .isArray()
      .withMessage('Specializations must be an array')

  ],
  
  createAdmin: [
    commonValidations.email(),
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    commonValidations.phone()
  ]
};

/**
 * Convenient exports for specific validations
 */
export const validateLogin = authValidations.login;
export const validateRegister = authValidations.register;
export const validateCreateAgent = userValidations.createAgent;
export const validateCreateAdmin = userValidations.createAdmin;
