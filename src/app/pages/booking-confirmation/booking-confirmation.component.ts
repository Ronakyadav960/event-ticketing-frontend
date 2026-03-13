import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { BookingService } from '../../services/booking.service';
import { finalize, take } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-booking-confirmation',
  imports: [CommonModule, QRCodeComponent],
  styleUrls: ['./booking-confirmation.component.css'],
  template: `
    <div class="booking-wrapper">
      <div class="ticket-shell" *ngIf="loading">
        <div class="ticket-card">
          <div class="ticket-header">
            <div class="status-pill">Loading</div>
            <div class="title">Preparing your ticket</div>
            <div class="subtitle">Please wait...</div>
          </div>
        </div>
      </div>

      <div class="ticket-shell" *ngIf="!loading && error">
        <div class="ticket-card error">
          <div class="ticket-header">
            <div class="status-pill danger">Invalid Booking</div>
            <div class="title">We could not verify this ticket</div>
            <div class="subtitle">{{ error }}</div>
          </div>
        </div>
      </div>

      <div class="ticket-shell" *ngIf="!loading && booking">
        <div class="ticket-card">
          <div class="ticket-header">
            <div class="status-pill success">Booking Confirmed</div>
            <div class="title">{{ booking?.event?.title || booking?.eventTitle || 'Event Ticket' }}</div>
            <div class="subtitle">Show this QR code at entry</div>
          </div>

          <div class="ticket-body">
            <div class="left">
              <div class="meta-grid">
                <div class="meta-item">
                  <div class="meta-label">Date</div>
                  <div class="meta-value">{{ (booking?.event?.date || booking?.eventDate || booking?.createdAt) | date:'fullDate' }}</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">Time</div>
                  <div class="meta-value">{{ (booking?.event?.date || booking?.eventDate || booking?.createdAt) | date:'shortTime' }}</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">Venue</div>
                  <div class="meta-value">{{ booking?.event?.venue || booking?.eventVenue || '-' }}</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">Seats</div>
                  <div class="meta-value">{{ booking.seats ?? '-' }}</div>
                </div>
              </div>

              <div class="divider"></div>

              <div class="info-block">
                <div class="info-title">Attendee</div>
                <div class="info-row">
                  <span>Name</span>
                  <span>{{ booking.name || booking.user?.name || '-' }}</span>
                </div>
                <div class="info-row">
                  <span>Email</span>
                  <span>{{ booking.email || booking.user?.email || '-' }}</span>
                </div>
              </div>

              <div class="info-block" *ngIf="booking?.registrationTemplate || booking?.registrationData">
                <div class="info-title">Registration</div>
                <div class="info-row">
                  <span>Template</span>
                  <span>{{ getRegistrationTemplateLabel(booking?.registrationTemplate) }}</span>
                </div>
                <div class="info-row" *ngFor="let item of getRegistrationItems(booking)">
                  <span>{{ item.label }}</span>
                  <span>{{ item.value }}</span>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="qr-box" *ngIf="qrData">
                <qrcode [qrdata]="qrData" [width]="180"></qrcode>
                <div class="qr-label">Scan at gate</div>
              </div>
              <div class="ticket-id">Ticket ID: <strong>{{ booking.ticketId || ticketId }}</strong></div>
              <div class="rules">
                <div class="rules-title">Entry Rules</div>
                <ul class="rules-list">
                  <li>Carry a valid ID</li>
                  <li>Gates open 30 minutes early</li>
                  <li>Non-refundable unless canceled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BookingConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bs = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

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

          this.saveDownloadedTicket(this.booking, tid);

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

  private getDownloadsKey(): string {
    const user = this.auth.getUser();
    const id = user?.id || user?._id || user?.email || 'guest';
    return `downloadedTickets:${id}`;
  }

  private saveDownloadedTicket(booking: any, fallbackTicketId: string): void {
    const ticketId = booking?.ticketId || fallbackTicketId;
    if (!ticketId) {
      return;
    }

    const ticket = {
      ticketId,
      event: {
        title: booking?.event?.title || booking?.eventTitle || 'Event Ticket',
        date: booking?.event?.date || booking?.eventDate || booking?.createdAt || new Date().toISOString(),
        venue: booking?.event?.venue || booking?.eventVenue || '-'
      },
      seats: booking?.seats ?? booking?.seatCount ?? '-',
      name: booking?.name || booking?.user?.name || '-',
      email: booking?.email || booking?.user?.email || '-',
      createdAt: booking?.createdAt || new Date().toISOString()
    };

    const key = this.getDownloadsKey();
    let list: any[] = [];

    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }

    const existingIndex = list.findIndex((t) => t?.ticketId === ticketId);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...ticket };
    } else {
      list.unshift(ticket);
    }

    localStorage.setItem(key, JSON.stringify(list));
  }

  getRegistrationTemplateLabel(template: string): string {
    if (template === 'workshop') return 'Workshop Form';
    if (template === 'seminar') return 'Seminar Form';
    return 'Standard Registration';
  }

  getRegistrationItems(b: any): Array<{ label: string; value: string }> {
    const data = b?.registrationData || {};
    const items: Array<{ label: string; value: string }> = [];

    const baseFields = ['phone', 'experience', 'skillLevel', 'company', 'designation'];
    baseFields.forEach((key) => {
      if (data[key]) {
        items.push({ label: this.toLabel(key), value: String(data[key]) });
      }
    });

    const custom = data?.customFields || {};
    Object.keys(custom).forEach((k) => {
      const val = custom[k];
      if (val === undefined || val === null || String(val).trim() === '') return;
      items.push({ label: this.toLabel(k), value: String(val) });
    });

    return items;
  }

  private toLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

