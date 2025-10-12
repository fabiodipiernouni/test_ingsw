import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PropertyService } from '@core/services/property/property.service';
import { Property } from '@features/properties/models/property';

@Component({
  selector: 'app-property-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatStepperModule,
    MatSnackBarModule
  ],
  templateUrl: './property-upload.html',
  styleUrl: './property-upload.scss'
})
export class PropertyUpload {
  private fb = inject(FormBuilder);
  private propertyService = inject(PropertyService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  uploadedImages = signal<File[]>([]);

  // Step 1: Basic Information
  basicInfoForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(50)]],
    price: [null, [Validators.required, Validators.min(1)]],
    propertyType: ['', Validators.required],
    listingType: ['', Validators.required]
  });

  // Step 2: Property Details
  detailsForm: FormGroup = this.fb.group({
    bedrooms: [null, [Validators.required, Validators.min(1)]],
    bathrooms: [null, [Validators.required, Validators.min(1)]],
    area: [null, [Validators.required, Validators.min(1)]],
    floor: [''],
    energyClass: [''],
    hasElevator: [false],
    hasBalcony: [false],
    hasGarden: [false],
    hasParking: [false]
  });

  // Step 3: Address
  addressForm: FormGroup = this.fb.group({
    street: ['', Validators.required],
    city: ['', Validators.required],
    province: ['', Validators.required],
    zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    country: ['Italia', Validators.required]
  });

  propertyTypes = [
    { value: 'apartment', label: 'Appartamento' },
    { value: 'villa', label: 'Villa' },
    { value: 'house', label: 'Casa' },
    { value: 'loft', label: 'Loft' },
    { value: 'office', label: 'Ufficio' }
  ];

  listingTypes = [
    { value: 'sale', label: 'Vendita' },
    { value: 'rent', label: 'Affitto' }
  ];

  energyClasses = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      this.uploadedImages.update(current => [...current, ...newFiles]);
    }
  }

  removeImage(index: number): void {
    this.uploadedImages.update(current =>
      current.filter((_, i) => i !== index)
    );
  }

  onSubmit(): void {
    if (this.basicInfoForm.valid && this.detailsForm.valid && this.addressForm.valid) {
      this.isLoading.set(true);

      const propertyData: Partial<Property> = {
        ...this.basicInfoForm.value,
        ...this.detailsForm.value,
        address: this.addressForm.value,
        images: [] // TODO: Handle image upload
      };

      // TODO
      /*
      this.propertyService.createProperty(propertyData).subscribe({
        next: (property) => {
          this.snackBar.open('Immobile caricato con successo!', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/properties', property.id]);
        },
        error: (error) => {
          this.snackBar.open('Errore durante il caricamento', 'Chiudi', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoading.set(false);
        }
      });
      */
    }
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      return `Minimo ${control.getError('minlength').requiredLength} caratteri`;
    }
    if (control?.hasError('min')) {
      return `Valore minimo: ${control.getError('min').min}`;
    }
    if (control?.hasError('pattern')) {
      return 'Formato non valido';
    }
    return '';
  }
}
