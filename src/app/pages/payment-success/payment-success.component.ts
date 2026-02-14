import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  selector: 'app-payment-success',
  template: `
    <div style="padding:24px;text-align:center">
      <h2>✅ Payment Successful</h2>
      <p *ngIf="!error">Finalizing your booking…</p>
      <p *ngIf="error" style="color:red">{{ error }}</p>
    </div>
  `
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  error = '';

  // ✅ PRODUCTION BACKEND URL
  private API_BASE = 'https://event-ticketing-backend-1.onrender.com/api';

  private tries = 0;
  private maxTries = 12;
  private timer: any = null;

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.error = 'Missing session id.';
      return;
    }

    this.pollForTicket(sessionId);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private pollForTicket(sessionId: string) {
    this.http
      .get<{
        success: boolean;
        status: string;
        ticketId?: string;
        message?: string;
      }>(`${this.API_BASE}/payments/stripe/session/${sessionId}`)
      .subscribe({
        next: (res) => {
          if (res?.success && res.status === 'READY' && res.ticketId) {
            this.router.navigate(['/booking', res.ticketId]);
            return;
          }

          if (res?.success && res.status === 'PENDING') {
            this.retry(sessionId);
            return;
          }

          this.error = res?.message || 'Unable to finalize booking.';
          this.timer = setTimeout(() => this.router.navigate(['/events']), 2000);
        },
        error: () => {
          if (this.tries < this.maxTries) {
            this.retry(sessionId);
          } else {
            this.error = 'Server error while finalizing booking.';
            this.timer = setTimeout(() => this.router.navigate(['/events']), 2000);
          }
        }
      });
  }

  private retry(sessionId: string) {
    this.tries += 1;

    if (this.tries >= this.maxTries) {
      this.error =
        'Booking is taking longer than expected. Please check your bookings.';
      this.timer = setTimeout(() => this.router.navigate(['/events']), 2000);
      return;
    }

    this.timer = setTimeout(() => this.pollForTicket(sessionId), 1000);
  }
}
