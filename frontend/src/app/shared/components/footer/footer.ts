import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}
