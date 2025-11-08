import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './coming-soon.html',
  styleUrls: ['./coming-soon.scss']
})
export class ComingSoon {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }
  
  goBack(): void {
    window.history.back();
  }
}
