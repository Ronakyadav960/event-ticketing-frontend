// src/app/pages/event-details/event-details.component.ts ✅ UPDATED (Stripe redirect + safer booking)

import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { EventService } from '../../services/event.service';
import { BookingService } from '../../services/booking.service';

@Component({
  standalone: true,
  selector: 'app-event-details',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="event-bg" [ngStyle]="bgStyle">
      <div class="overlay"></div>

      <div class="content">
        <div class="details-wrap">
          <div *ngIf="loading" class="msg">Loading event...</div>

          <div *ngIf="!loading && error" class="msg error">❌ {{ error }}</div>

          <div *ngIf="!loading && event">
            <h2 class="title">{{ event.title }}</h2>
            <p class="muted">
              <span *ngIf="event.venue">{{ event.venue }} | </span>
              {{ event.date ? (event.date | date: 'medium') : '' }}
            </p>

            <p *ngIf="event.description" class="desc">{{ event.description }}</p>

            <div class="card">
              <h3 class="card-title">🎟 Book Tickets</h3>

              <div *ngIf="msg" class="msg ok">{{ msg }}</div>

              <form (ngSubmit)="book()" #f="ngForm">
                <div class="form-group">
                  <label>Name</label>
                  <input class="form-control" name="name" [(ngModel)]="name" required />
                </div>

                <div class="form-group">
                  <label>Email</label>
                  <input class="form-control" name="email" [(ngModel)]="email" required />
                </div>

                <div class="form-group">
                  <label>Seats</label>
                  <input
                    class="form-control"
                    type="number"
                    name="seats"
                    [(ngModel)]="seats"
                    min="1"
                    required
                  />
                </div>

                <button class="btn" type="submit" [disabled]="f.invalid || submitting">
                  {{ submitting ? 'Redirecting to payment...' : 'Proceed to Payment' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .event-bg {
        min-height: 100vh;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        position: relative;
      }
      .overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(2px);
      }
      .content {
        position: relative;
        z-index: 2;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .details-wrap {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        padding: 16px;
        color: #fff;
      }
      .title {
        margin: 0 0 6px;
      }
      .muted {
        color: rgba(255, 255, 255, 0.8);
        margin-top: -6px;
      }
      .desc {
        margin-top: 10px;
        color: rgba(255, 255, 255, 0.9);
      }

      .card {
        padding: 16px;
        margin-top: 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(10px);
        color: #fff;
      }
      .card-title {
        margin: 0 0 10px;
      }

      .form-group {
        margin-bottom: 12px;
      }
      label {
        display: block;
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.9);
      }

      .form-control {
        width: 100%;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 12px;
        outline: none;
        background: rgba(0, 0, 0, 0.25);
        color: #fff;
      }
      .form-control::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      .btn {
        padding: 10px 14px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        background: #16a34a;
        color: #fff;
        width: 100%;
        font-weight: 600;
      }

      .msg {
        margin: 10px 0;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #fff;
        backdrop-filter: blur(8px);
      }
      .msg.error {
        background: rgba(255, 0, 0, 0.12);
        border: 1px solid rgba(255, 0, 0, 0.25);
      }
      .msg.ok {
        background: rgba(0, 255, 0, 0.1);
        border: 1px solid rgba(0, 255, 0, 0.18);
      }
    `,
  ],
})
export class EventDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private es = inject(EventService);
  private bs = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';

  event: any = null;

  name = '';
  email = '';
  seats = 1;

  submitting = false;
  msg = '';

  private BASE = 'http://localhost:5000';
  bgStyle: Record<string, string> = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.error = 'Invalid event id.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.event = null;

    this.es.getEventById(id).subscribe({
      next: (res: any) => {
        const ev = res?.event ?? res?.data ?? res;
        this.event = ev;

        const id = ev?._id || ev?.id;
        const full = id ? `${this.BASE}/api/events/${id}/image` : '';

        this.bgStyle = full ? { 'background-image': `url('${full}')` } : {};

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Event load failed.';
        console.error('getEventById error:', err);
        this.cdr.detectChanges();
      },
    });
  }

  private toUnitAmountPaise(): number {
    const paiseLike =
      this.event?.unitAmount ?? this.event?.pricePaise ?? this.event?.ticketPricePaise;

    const rupeesLike = this.event?.price ?? this.event?.ticketPrice ?? this.event?.amount;

    const p = Number(paiseLike);
    if (Number.isFinite(p) && p > 0 && Number.isInteger(p)) return p;

    const r = Number(rupeesLike);
    if (Number.isFinite(r) && r > 0) return Math.round(r * 100);

    return 0;
  }

  book(): void {
    if (!this.event) return;
    if (this.submitting) return; // ✅ prevent double clicks

    const eventId = this.event._id || this.event.id;
    if (!eventId) {
      this.msg = 'Event id missing.';
      return;
    }

    const qty = Number(this.seats);
    if (!Number.isInteger(qty) || qty < 1) {
      this.msg = '❌ Seats must be at least 1.';
      return;
    }

    const unitAmount = this.toUnitAmountPaise();
    if (!unitAmount) {
      this.msg = '❌ Ticket price missing in event. Please set event price in backend.';
      return;
    }

    this.submitting = true;
    this.msg = '';

    this.bs
      .createCheckoutSession({
        eventId,
        ticketName: this.event?.title || 'Event Ticket',
        quantity: qty,
        unitAmount,
        currency: 'inr',
        name: this.name,
        email: this.email,
      })
      .subscribe({
        next: (res: any) => {
          this.submitting = false;

          const url = res?.url;
          if (url) {
            window.location.href = url;
            return;
          }

          this.msg = '❌ Payment session not created (missing url).';
        },
        error: (err: any) => {
          this.submitting = false;
          this.msg = err?.error?.message || 'Payment init failed';
          console.error('create-checkout-session error:', err);
        },
      });
  }
}
