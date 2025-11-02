import { Routes } from '@angular/router';
import { authGuard, guestGuard, agentGuard, ownerGuard, adminOrOwnerGuard } from './core/guards/auth-guard';


export const routes: Routes = [
  // Public routes
  {
    path: '',
    redirectTo: '/search',
    pathMatch: 'full'
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search/search').then(m => m.Search),
    title: 'Cerca Immobili - DietiEstates25'
  },

  // Auth routes (only for guests)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    canActivate: [guestGuard],
    title: 'Accedi - DietiEstates25'
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
    canActivate: [guestGuard],
    title: 'Registrati - DietiEstates25'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
    canActivate: [guestGuard],
    title: 'Recupera Password - DietiEstates25'
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email').then(m => m.VerifyEmail),
    canActivate: [guestGuard],
    title: 'Verifica Email - DietiEstates25'
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback').then(m => m.OAuthCallback),
    title: 'Autenticazione in corso... - DietiEstates25'
  },

  // Protected routes (require authentication)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
    title: 'Dashboard - DietiEstates25'
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding').then(m => m.Onboarding),
    canActivate: [authGuard],
    title: 'Benvenuto - DietiEstates25'
  },
  // Admin management routes
  {
    path: 'create-admin',
    loadComponent: () => import('./features/admin/create-admin/create-admin').then(m => m.CreateAdmin),
    canActivate: [authGuard, ownerGuard],
    title: 'Crea Amministratore - DietiEstates25'
  },
  {
    path: 'create-agent',
    loadComponent: () => import('./features/admin/create-agent/create-agent').then(m => m.CreateAgent),
    canActivate: [authGuard, adminOrOwnerGuard],
    title: 'Crea Agente - DietiEstates25'
  },
  {
    path: 'send-promotional-message',
    loadComponent: () => import('./features/admin/send-promotional-message/send-promotional-message').then(m => m.SendPromotionalMessage),
    canActivate: [authGuard, adminOrOwnerGuard],
    title: 'Invia Messaggio Promozionale - DietiEstates25'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
    canActivate: [authGuard],
    title: 'Il Mio Profilo - DietiEstates25'
  },
  {
    path: 'saved-searches',
    loadComponent: () => import('./features/saved-searches/saved-searches/saved-searches').then(m => m.SavedSearches),
    canActivate: [authGuard],
    title: 'Ricerche Salvate - DietiEstates25'
  },

  // Property routes
  {
    path: 'properties',
    children: [
      {
        path: 'upload',
        loadComponent: () => import('./features/properties/property-upload/property-upload').then(m => m.PropertyUpload),
        canActivate: [authGuard, agentGuard],
        title: 'Carica Immobile - DietiEstates25'
      },
      {
        path: ':id',
        loadComponent: () => import('./features/properties/property-detail/property-detail').then(m => m.PropertyDetail),
        title: 'Dettaglio Immobile - DietiEstates25'
      }
    ]
  },

  // Error routes
  {
    path: 'unauthorized',
    loadComponent: () => import('@features/error/unauthorized/unauthorized').then(m => m.Unauthorized),
    title: 'Accesso Negato - DietiEstates25'
  },
  {
    path: 'coming-soon',
    loadComponent: () => import('@features/error/coming-soon/coming-soon').then(m => m.ComingSoon),
    title: 'Funzionalità in arrivo - DietiEstates25'
  },
  {
    path: '404',
    loadComponent: () => import('@features/error/not-found/not-found').then(m => m.NotFound),
    title: 'Pagina Non Trovata - DietiEstates25'
  },

  // Legal routes
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/privacy/privacy-page').then(m => m.PrivacyPageComponent),
    title: 'Privacy Policy - DietiEstates25'
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/terms/terms-page').then(m => m.TermsPageComponent),
    title: 'Termini e Condizioni - DietiEstates25'
  },

  // Coming soon feature routes
  {
    path: 'help',
    redirectTo: '/coming-soon'
  },
  {
    path: 'contact',
    redirectTo: '/coming-soon'
  },
  {
    path: 'faq',
    redirectTo: '/coming-soon'
  },
  {
    path: 'cookies',
    redirectTo: '/coming-soon'
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/404'
  }
];
