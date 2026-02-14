// src/app/app.routes.ts  (Standalone Angular Routing)

import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

import { EventsComponent } from './pages/events/events.component';
import { EventDetailsComponent } from './pages/event-details/event-details.component';
import { CreateEventComponent } from './pages/create-event/create-event.component';
import { BookingConfirmationComponent } from './pages/booking-confirmation/booking-confirmation.component';

import { AdminDashboardComponent } from './admin/admin-dashboard.component';

import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';
import { PaymentCancelComponent } from './pages/payment-cancel/payment-cancel.component';

import { authGuard } from './auth/auth-guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [

  // ---------- AUTH ----------
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // ---------- USER ----------
  { path: 'events', component: EventsComponent, canActivate: [authGuard] },
  { path: 'events/:id', component: EventDetailsComponent, canActivate: [authGuard] },

  { path: 'payment-success', component: PaymentSuccessComponent, canActivate: [authGuard] },
  { path: 'payment-cancel', component: PaymentCancelComponent, canActivate: [authGuard] },

  { path: 'booking/:ticketId', component: BookingConfirmationComponent, canActivate: [authGuard] },

  // ---------- ADMIN ----------
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, adminGuard],
  },

  { path: 'admin-dashboard', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'create-event',
    component: CreateEventComponent,
    canActivate: [authGuard, adminGuard],
  },

  // ---------- FALLBACK ----------
  { path: '**', redirectTo: 'events' }

];
