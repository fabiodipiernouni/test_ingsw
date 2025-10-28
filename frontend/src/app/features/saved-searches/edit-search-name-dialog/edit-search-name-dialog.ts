import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface EditSearchNameDialogData {
  currentName: string;
}

@Component({
  selector: 'app-edit-search-name-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './edit-search-name-dialog.html',
  styleUrls: ['./edit-search-name-dialog.scss']
})
export class EditSearchNameDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EditSearchNameDialog>);
  
  form: FormGroup;
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: EditSearchNameDialogData) {
    this.form = this.fb.group({
      name: [data.currentName, [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(200)
      ]]
    });
  }
  
  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.get('name')?.value);
    }
  }
}
