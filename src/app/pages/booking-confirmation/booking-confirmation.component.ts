import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { BookingService } from '../../services/booking.service';
import { finalize, take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-booking-confirmation',
  imports: [CommonModule, QRCodeComponent],
  styleUrls: ['./booking-confirmation.component.css'],
  template: `
    <div class="booking-wrapper">

      <!-- LOADING -->
      <div class="booking-card" *ngIf="loading">
        <h3>Loading booking...</h3>
      </div>

      <!-- ERROR -->
      <div class="booking-card error" *ngIf="!loading && error">
        <h3>❌ Invalid Booking</h3>
        <p>{{ error }}</p>
      </div>

      <!-- SUCCESS -->
      <div class="booking-card" *ngIf="!loading && booking">
        <h3>🎟 Booking Confirmed</h3>
        <p class="sub-text">Show this QR code at event entry</p>

        <div class="info">
          <p><span>Name</span> {{ booking.name || booking.user?.name || '-' }}</p>
          <p><span>Email</span> {{ booking.email || booking.user?.email || '-' }}</p>
          <p><span>Seats</span> {{ booking.seats ?? '-' }}</p>
        </div>

        <div class="qr-box" *ngIf="qrData">
          <qrcode [qrdata]="qrData" [width]="180"></qrcode>
        </div>

        <p class="ticket-id">
          Ticket ID: <strong>{{ booking.ticketId || ticketId }}</strong>
        </p>
      </div>

    </div>
  `
})
export class BookingConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bs = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);

  booking: any = null;
  ticketId = '';
  qrData = '';

  loading = true;
  error = '';

  ngOnInit(): void {
    const tid = this.route.snapshot.paramMap.get('ticketId');

    if (!tid) {
      this.loading = false;
      this.error = 'TicketId missing in URL.';
      return;
    }

    this.ticketId = tid;
    this.loading = true;
    this.error = '';
    this.booking = null;

    this.bs.getByTicketId(tid)
      .pipe(
        take(1),
        finalize(() => {
          // ✅ UI kabhi stuck nahi hogi
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          // ✅ backend direct booking ya wrapped: { booking: ... }
          this.booking = res?.booking ?? res?.data ?? res;

          // ✅ QR always string
          this.qrData = String(this.booking?.ticketId || tid);

          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.error =
            err?.error?.message ||
            err?.message ||
            'Booking not found / unauthorized.';
          console.error('getByTicketId error:', err);

          this.cdr.detectChanges();
        }
      });
  }
}
