// src/app/app-routing.module.ts ✅ UPDATED (Stripe success / cancel routes added)
// ✅ Existing routes untouched, only minimal additions

import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

import { EventsComponent } from './pages/events/events.component';
import { EventDetailsComponent } from './pages/event-details/event-details.component';
import { CreateEventComponent } from './pages/create-event/create-event.component';
import { BookingConfirmationComponent } from './pages/booking-confirmation/booking-confirmation.component';

import { authGuard } from './auth/auth-guard';
import { adminGuard } from './guards/admin.guard';

import { AdminDashboardComponent } from './admin/admin-dashboard.component';

// ✅ NEW: Stripe result pages (will be created)
import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';
import { PaymentCancelComponent } from './pages/payment-cancel/payment-cancel.component';

export const routes: Routes = [
  // ---------- AUTH ----------
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // ---------- USER ----------
  { path: 'events', component: EventsComponent, canActivate: [authGuard] },
  { path: 'events/:id', component: EventDetailsComponent, canActivate: [authGuard] },

  // ✅ Stripe redirects back here
  { path: 'payment-success', component: PaymentSuccessComponent, canActivate: [authGuard] },
  { path: 'payment-cancel', component: PaymentCancelComponent, canActivate: [authGuard] },

  // ✅ Booking confirmation (after webhook creates booking)
  { path: 'booking/:ticketId', component: BookingConfirmationComponent, canActivate: [authGuard] },

  // ---------- ADMIN PORTAL ----------
  {
    path: 'dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, adminGuard],
  },

  // keep old route working
  { path: 'admin-dashboard', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'create-event',
    component: CreateEventComponent,
    canActivate: [authGuard, adminGuard],
  },

  // ---------- FALLBACK ----------
  { path: '**', redirectTo: 'events' },
];
