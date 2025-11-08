import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideRouter, withDebugTracing } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { routes } from '@app/app.routes';
import { App } from '@app/app';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { environment } from './environments/environment';

bootstrapApplication(App, {
  providers: [
    // Router
    provideRouter(routes, ...(environment.production ? [] : [withDebugTracing()])),

    // HTTP Client with interceptors
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),

    // Animations
    provideAnimations(),

    // Material modules that need to be imported
    importProvidersFrom(
      MatSnackBarModule
    )
  ]
}).catch(err => console.error(err));
