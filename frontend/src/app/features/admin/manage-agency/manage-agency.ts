import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AgencyManagementService } from '@core-services/auth/agency-management.service';
import { AuthService } from '@core-services/auth/auth.service';
import { UserResponse } from '@core-services/auth/dto/UserResponse';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog';
import { GetAgentsRequest } from '@core-services/auth/dto/GetAgentsRequest';
import { GetAdminsRequest } from '@core-services/auth/dto/GetAdminsRequest';

type ViewMode = 'agents' | 'admins';

@Component({
  selector: 'app-manage-agency',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    MatPaginatorModule
  ],
  templateUrl: './manage-agency.html',
  styleUrls: ['./manage-agency.scss']
})
export class ManageAgency implements OnInit {
  private agencyService = inject(AgencyManagementService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  isLoading = signal(false);
  users = signal<UserResponse[]>([]);
  viewMode = signal<ViewMode>('agents');

  // Paginazione
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(20);
  pageSizeOptions = [10, 20, 50, 100];
  
  // Ordinamento
  sortBy = signal('createdAt');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');

  // User role checks
  isOwner = computed(() => this.authService.isOwner());
  isAdmin = computed(() => this.authService.isAdmin());

  displayedColumns = ['name', 'email', 'phone', 'status', 'createdAt', 'actions'];

  ngOnInit() {
    // Leggi il parametro view dalla query string
    this.route.queryParams.subscribe(params => {
      const view = params['view'] as ViewMode;
      if (view === 'agents' || view === 'admins') {
        this.viewMode.set(view);
      }
    });
    
    this.loadUsers();
  }

  /**
   * Carica gli utenti in base alla modalità di visualizzazione
   */
  loadUsers() {
    this.isLoading.set(true);
    
    // Costruisci la request con paginazione
    const pagedRequest = {
      page: this.currentPage(),
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    const observable = this.viewMode() === 'agents' 
      ? this.agencyService.getAgents({ pagedRequest })
      : this.agencyService.getAdmins({ pagedRequest });

    observable.subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users.set(response.data.data);
          this.totalCount.set(response.data.totalCount);
          this.currentPage.set(response.data.currentPage);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackBar.open(
          error.error?.message || 'Errore nel caricamento degli utenti',
          'Chiudi',
          { duration: 5000 }
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Cambia la modalità di visualizzazione
   */
  onViewModeChange(mode: ViewMode) {
    this.viewMode.set(mode);
    this.currentPage.set(1); // Reset alla prima pagina
    this.loadUsers();
  }

  /**
   * Gestisce il cambio di pagina
   */
  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  /**
   * Naviga alla pagina di creazione
   */
  navigateToCreate() {
    if (this.viewMode() === 'agents') {
      this.router.navigate(['/create-agent']);
    } else {
      this.router.navigate(['/create-admin']);
    }
  }

  /**
   * Elimina un utente con conferma
   */
  deleteUser(user: UserResponse) {
    const userType = this.viewMode() === 'agents' ? 'agente' : 'amministratore';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      disableClose: false,
      autoFocus: true,
      data: {
        title: `Elimina ${userType}`,
        message: `Sei sicuro di voler eliminare ${user.firstName} ${user.lastName}?\n\nQuesta azione non può essere annullata.`,
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        confirmColor: 'warn',
        confirmIcon: 'delete',
        cancelIcon: 'close',
        width: '500px'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performDelete(user.id);
      }
    });
  }

  /**
   * Esegue l'eliminazione dell'utente
   */
  private performDelete(userId: string) {
    this.isLoading.set(true);
    const observable = this.viewMode() === 'agents'
      ? this.agencyService.deleteAgent(userId)
      : this.agencyService.deleteAdmin(userId);

    observable.subscribe({
      next: (response) => {
        if (response.success) {
          const userType = this.viewMode() === 'agents' ? 'Agente' : 'Amministratore';
          this.snackBar.open(
            `${userType} eliminato con successo`,
            'Chiudi',
            { duration: 3000 }
          );
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.snackBar.open(
          error.error?.message || 'Errore nell\'eliminazione dell\'utente',
          'Chiudi',
          { duration: 5000 }
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Ottiene il badge di stato dell'utente
   */
  getUserStatusBadge(user: UserResponse): { text: string; class: string } {
    if (!user.isActive) {
      return { text: 'Inattivo', class: 'status-inactive' };
    }
    if (!user.isVerified) {
      return { text: 'Non verificato', class: 'status-unverified' };
    }
    return { text: 'Attivo', class: 'status-active' };
  }

  /**
   * Formatta la data
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT');
  }

  /**
   * Verifica se può visualizzare gli admin
   */
  canViewAdmins(): boolean {
    return this.isOwner();
  }

  /**
   * Verifica se può creare utenti
   */
  canCreate(): boolean {
    if (this.viewMode() === 'agents') {
      return this.isAdmin() || this.isOwner();
    }
    return this.isOwner();
  }
}
