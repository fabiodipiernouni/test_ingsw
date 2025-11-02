import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth/auth.service';
import { CreateAgentRequest } from '@core-services/auth/dto/CreateAgentRequest';
import { AuthLayoutComponent, AuthLayoutConfig } from '@shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-create-agent',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    AuthLayoutComponent
  ],
  templateUrl: './create-agent.html',
  styleUrls: ['./create-agent.scss']
})
export class CreateAgent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  isLoading = signal(false);
  specializations = signal<string[]>([]);

  authConfig: AuthLayoutConfig = {
    title: 'Crea Nuovo Agente',
    subtitle: 'Inserisci i dati del nuovo agente immobiliare',
    footerText: 'Vai alla',
    footerLinkText: 'Gestione Agenzia',
    footerLinkRoute: '/admin/manage-agency',
    footerLinkQueryParams: { view: 'agents' }
  };

  agentForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    phone: ['', [Validators.pattern(/^\+\d{1,15}$/)]],
    licenseNumber: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    biography: ['', [Validators.maxLength(1000)]],
    specializationInput: ['']
  });

  addSpecialization(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const input = this.agentForm.get('specializationInput')?.value?.trim();
    if (input && !this.specializations().includes(input)) {
      this.specializations.update(specs => [...specs, input]);
      this.agentForm.patchValue({ specializationInput: '' });
    }
  }

  removeSpecialization(spec: string): void {
    this.specializations.update(specs => specs.filter(s => s !== spec));
  }

  onSubmit(): void {
    if (this.agentForm.valid) {
      this.isLoading.set(true);

      const agentData: CreateAgentRequest = {
        email: this.agentForm.value.email.trim(),
        firstName: this.agentForm.value.firstName.trim(),
        lastName: this.agentForm.value.lastName.trim(),
        phone: this.agentForm.value.phone?.trim() || undefined,
        licenseNumber: this.agentForm.value.licenseNumber.trim(),
        biography: this.agentForm.value.biography?.trim() || undefined,
        specializations: this.specializations().length > 0 ? this.specializations().map(spec => spec.trim().toLowerCase()) : undefined
      };

      this.authService.createAgent(agentData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.snackBar.open('Agente creato con successo!', 'Chiudi', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.snackBar.open(response.message || 'Errore durante la creazione dell\'agente', 'Chiudi', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMessage = error.error?.message || error.message || 'Errore durante la creazione dell\'agente';
          this.snackBar.open(errorMessage, 'Chiudi', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.agentForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.agentForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Campo obbligatorio';
    if (control.errors['email']) return 'Email non valida';
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Minimo ${minLength} caratteri`;
    }
    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }
    if (control.errors['pattern']) {
      if (fieldName === 'phone') {
        return 'Il numero deve essere in formato E.164 (es. +391234567890)';
      }
      return 'Formato non valido';
    }

    return 'Campo non valido';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
