// src/app/app.routes.ts

import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

import { EventsComponent } from './pages/events/events.component';
import { EventDetailsComponent } from './pages/event-details/event-details.component';
import { CreateEventComponent } from './pages/create-event/create-event.component';
import { BookingConfirmationComponent } from './pages/booking-confirmation/booking-confirmation.component';
import { BookingHistoryComponent } from './pages/booking-history/booking-history.component';

import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';
import { PaymentCancelComponent } from './pages/payment-cancel/payment-cancel.component';

import { authGuard } from './auth/auth-guard';

export const routes: Routes = [

  // ---------- AUTH ----------
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // ---------- USER ----------
  { path: 'events', component: EventsComponent, canActivate: [authGuard] },
  { path: 'events/:id', component: EventDetailsComponent, canActivate: [authGuard] },
  { path: 'history', component: BookingHistoryComponent, canActivate: [authGuard] },

  { path: 'payment-success', component: PaymentSuccessComponent, canActivate: [authGuard] },
  { path: 'payment-cancel', component: PaymentCancelComponent, canActivate: [authGuard] },

  { path: 'booking/:ticketId', component: BookingConfirmationComponent, canActivate: [authGuard] },

  // ---------- CREATOR + SUPERADMIN ----------

  {
  path: 'creator-dashboard',
  loadComponent: () =>
    import('./dashboards/creator-dashboard/creator-dashboard.component')
      .then(m => m.CreatorDashboardComponent),
  canActivate: [authGuard],
  data: { role: 'creator' }
},

{
  path: 'superadmin-dashboard',
  loadComponent: () =>
    import('./dashboards/superadmin-dashboard/superadmin-dashboard.component')
      .then(m => m.SuperadminDashboardComponent),
  canActivate: [authGuard],
  data: { role: 'superadmin' }
},


  {
    path: 'create-event',
    component: CreateEventComponent,
    canActivate: [authGuard],
    data: { role: 'creator' }
  },
  

  // ---------- FALLBACK ----------
  { path: '**', redirectTo: 'events' }

];
