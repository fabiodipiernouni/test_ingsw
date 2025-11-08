import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../../../shared/components/auth-layout/auth-layout';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [CommonModule, AuthLayoutComponent],
  templateUrl: './terms-page.html',
  styleUrls: ['./terms-page.scss']
})
export class TermsPageComponent {

  config = {
    title: 'Termini e Condizioni',
    subtitle: 'Leggi i nostri termini di servizio'
  };

}
