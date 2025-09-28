import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserService } from '../../../../core/services/user.service';
import { User, UpdateProfileRequest } from '@core/entities/user.model';

@Component({
  selector: 'app-personal-data',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './personal-data.html',
  styleUrls: ['./personal-data.scss']
})
export class PersonalData implements OnInit, OnChanges {
  @Input() currentUser: User | null = null;
  @Output() userUpdated = new EventEmitter<User>();

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal<boolean>(false);
  personalDataForm!: FormGroup;
  specializations = signal<string[]>([]);
  newSpecialization = signal<string>('');

  constructor() {
    // Initialize form early to prevent undefined errors
    this.personalDataForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      biography: ['', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadSpecializations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUser'] && changes['currentUser'].currentValue) {
      this.initializeForm();
      this.loadSpecializations();
    }
  }

  private initializeForm(): void {
    const user = this.currentUser;

    this.personalDataForm = this.fb.group({
      firstName: [user?.firstName || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: [user?.lastName || '', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      biography: [user?.biography || '', [Validators.maxLength(1000)]]
    });
  }

  private loadSpecializations(): void {
    if (this.currentUser?.specializations) {
      this.specializations.set([...this.currentUser.specializations]);
    }
  }

  isAgent(): boolean {
    return this.currentUser?.role === 'agent';
  }

  onSubmit(): void {
    if (this.personalDataForm.valid) {
      this.isLoading.set(true);

      const updateData: UpdateProfileRequest = {
        firstName: this.personalDataForm.value.firstName,
        lastName: this.personalDataForm.value.lastName
      };

      // Add agent-specific fields
      if (this.isAgent()) {
        updateData.biography = this.personalDataForm.value.biography || undefined;
        updateData.specializations = this.specializations();
      }

      this.userService.updateProfile(updateData).subscribe({
        next: (updatedUser) => {
          this.isLoading.set(false);
          this.userUpdated.emit(updatedUser);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante l\'aggiornamento dei dati',
            'Chiudi',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onReset(): void {
    this.initializeForm();
    this.loadSpecializations();
  }

  // Specializations management (for agents)
  addSpecialization(): void {
    const newSpec = this.newSpecialization().trim();
    if (newSpec && !this.specializations().includes(newSpec)) {
      this.specializations.update(specs => [...specs, newSpec]);
      this.newSpecialization.set('');
    }
  }

  removeSpecialization(index: number): void {
    this.specializations.update(specs => specs.filter((_, i) => i !== index));
  }

  onSpecializationKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSpecialization();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.personalDataForm.controls).forEach(key => {
      const control = this.personalDataForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.personalDataForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `Minimo ${minLength} caratteri`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }

    return '';
  }
}
