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
    <div class="event-bg" [ngStyle]="bgStyle" [ngClass]="designTemplateClass">
      <div class="overlay"></div>

      <div class="content">
        <div class="details-wrap">
          <div *ngIf="loading" class="msg">Loading event...</div>

          <div *ngIf="!loading && error" class="msg error">Error: {{ error }}</div>

          <div *ngIf="!loading && event">
            <ng-container [ngSwitch]="designTemplateKey">
              <ng-container *ngSwitchCase="'movie'">
                <div class="layout movie-layout" [style.--theme-color]="designThemeColor">
                  <div class="movie-left">
                    <div class="hero-media">
                      <img *ngIf="eventImageUrl; else movieNoImg" [src]="eventImageUrl" alt="poster" />
                      <ng-template #movieNoImg>
                        <div class="poster-fallback">No Image</div>
                      </ng-template>
                    </div>
                    <div class="chip-row">
                      <span class="chip">{{ event?.category || 'Movie' }}</span>
                      <span class="chip">{{ event?.locationType || 'In-person' }}</span>
                    </div>
                    <div class="section">
                      <div class="section-title">About the Event</div>
                      <div class="desc" [innerHTML]="event.description || 'No description yet.'"></div>
                    </div>
                  </div>
                  <div class="movie-right">
                    <div class="ticket-card">
                      <div class="kicker">Now Showing</div>
                      <h2 class="title">{{ event.title }}</h2>
                      <div class="meta-line">{{ event.date | date: 'fullDate' }} � {{ event.date | date: 'shortTime' }}</div>
                      <div class="meta-line">{{ event.venue || '-' }}</div>
                      <div class="price-row">From Rs {{ event.price ?? 0 }}</div>
                      <button class="btn primary" type="button" (click)="openBooking()">{{ designConfig?.badgeText || 'Book Now' }}</button>
                    </div>                  </div>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'concert'">
                <div class="layout concert-layout" [style.--theme-color]="designThemeColor">
                  <div class="concert-hero" [ngStyle]="{'background-image': eventImageUrl ? 'url(' + eventImageUrl + ')' : ''}">
                    <div class="concert-overlay"></div>
                    <div class="concert-content">
                      <div class="kicker glow">{{ designConfig?.heroKicker || 'Live Concert' }}</div>
                      <h2 class="title">{{ event.title }}</h2>
                      <div class="meta-line">{{ event.date | date: 'fullDate' }} � {{ event.date | date: 'shortTime' }}</div>
                      <div class="meta-line">{{ event.venue || '-' }}</div>
                      <div class="price-row">Rs {{ event.price ?? 0 }}</div>
                      <button class="btn primary" type="button" (click)="openBooking()">{{ designConfig?.ctaText || 'Get Tickets' }}</button>
                    </div>
                  </div>
                  <div class="concert-body">
                    <div class="section">
                      <div class="section-title">About the Show</div>
                      <div class="desc" [innerHTML]="event.description || 'No description yet.'"></div>
                    </div>                  </div>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'comedy'">
                <div class="layout comedy-layout" [style.--theme-color]="designThemeColor">
                  <div class="comedy-card">
                    <div class="comedy-left">
                      <div class="kicker">Comedy Night</div>
                      <h2 class="title">{{ event.title }}</h2>
                      <div class="meta-line">{{ event.date | date: 'fullDate' }} � {{ event.date | date: 'shortTime' }}</div>
                      <div class="meta-line">{{ event.venue || '-' }}</div>
                      <div class="price-row">Rs {{ event.price ?? 0 }}</div>
                      <div class="desc" [innerHTML]="event.description || 'No description yet.'"></div>
                    </div>
                    <div class="comedy-right">
                      <div class="hero-media square">
                        <img *ngIf="eventImageUrl; else comedyNoImg" [src]="eventImageUrl" alt="poster" />
                        <ng-template #comedyNoImg>
                          <div class="poster-fallback">No Image</div>
                        </ng-template>
                      </div>
                      <button class="btn primary" type="button" (click)="openBooking()">{{ designConfig?.ctaText || 'Book Seats' }}</button>
                    </div>
                  </div>                </div>
              </ng-container>

              <ng-container *ngSwitchDefault>
                <div class="layout default-layout" [style.--theme-color]="designThemeColor">
                  <div class="default-left">
                    <div class="kicker">{{ event?.category || 'Event' }}</div>
                    <h2 class="title">{{ event.title }}</h2>
                    <div class="meta-stack">
                      <div class="meta-item">
                        <span class="meta-label">Date</span>
                        <span>{{ event.date | date: 'fullDate' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">Time</span>
                        <span>{{ event.date | date: 'shortTime' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">Venue</span>
                        <span>{{ event.venue || '-' }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">Type</span>
                        <span>{{ event?.locationType || 'In-person' }}</span>
                      </div>
                    </div>
                    <div class="hero-media wide">
                      <img *ngIf="eventImageUrl; else defaultNoImg" [src]="eventImageUrl" alt="poster" />
                      <ng-template #defaultNoImg>
                        <div class="poster-fallback">No Image</div>
                      </ng-template>
                    </div>
                    <div class="section">
                      <div class="section-title">Overview</div>
                      <div class="desc" [innerHTML]="event.description || 'No description yet.'"></div>
                    </div>
                  </div>

                  <div class="default-right">
                    <div class="price-card">
                      <div class="price-label">Starting From</div>
                      <div class="price-amount">Rs {{ event.price ?? 0 }}</div>

                      <button class="btn primary" type="button" (click)="openBooking()">Reserve Seats</button>
                    </div>

                    <div class="locked-card" *ngIf="!showBookingForm">
                      <div class="locked-title">Booking unlocked on click</div>
                      <div class="locked-sub">Tap "Reserve Seats" to fill details.</div>
                    </div>
                  </div>
                </div>
              </ng-container>
            </ng-container>

            <ng-template #bookingForm>
              <form (ngSubmit)="book()" #f="ngForm">
                <div class="form-group">
                  <label>Name</label>
                  <input class="form-control" name="name" [(ngModel)]="name" required />
                </div>

                <div class="form-group">
                  <label>Email</label>
                  <input class="form-control" name="email" [(ngModel)]="email" required />
                </div>

                <div class="form-group" *ngIf="isStandard">
                  <label>Phone</label>
                  <input class="form-control" name="phone" [(ngModel)]="phone" required />
                </div>

                <div class="form-group" *ngIf="isWorkshop">
                  <label>Experience</label>
                  <input class="form-control" name="experience" [(ngModel)]="experience" required />
                </div>

                <div class="form-group" *ngIf="isWorkshop">
                  <label>Skill Level</label>
                  <select class="form-control" name="skillLevel" [(ngModel)]="skillLevel" required>
                    <option value="">Select level</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>

                <div class="form-group" *ngIf="isSeminar">
                  <label>Company</label>
                  <input class="form-control" name="company" [(ngModel)]="company" required />
                </div>

                <div class="form-group" *ngIf="isSeminar">
                  <label>Designation</label>
                  <input class="form-control" name="designation" [(ngModel)]="designation" required />
                </div>

                <div class="form-group" *ngFor="let f of customFields; let i = index">
                  <label>
                    {{ f.label }}
                    <span *ngIf="f.required" class="req">*</span>
                  </label>

                  <input
                    *ngIf="isTextType(f.type)"
                    class="form-control"
                    [type]="inputTypeFor(f.type)"
                    [name]="'custom_' + i"
                    [ngModel]="customFieldValues[fieldKey(f, i)]"
                    (ngModelChange)="setCustomValue(f, i, $event)"
                    [required]="f.required"
                  />

                  <textarea
                    *ngIf="f.type === 'textarea'"
                    class="form-control"
                    rows="3"
                    [name]="'custom_' + i"
                    [ngModel]="customFieldValues[fieldKey(f, i)]"
                    (ngModelChange)="setCustomValue(f, i, $event)"
                    [required]="f.required"
                  ></textarea>

                  <select
                    *ngIf="f.type === 'select'"
                    class="form-control"
                    [name]="'custom_' + i"
                    [ngModel]="customFieldValues[fieldKey(f, i)]"
                    (ngModelChange)="setCustomValue(f, i, $event)"
                    [required]="f.required"
                  >
                    <option value="">Select option</option>
                    <option *ngFor="let o of f.options || []" [value]="o">{{ o }}</option>
                  </select>

                  <label *ngIf="f.type === 'checkbox'" class="check-row">
                    <input
                      type="checkbox"
                      [checked]="customFieldValues[fieldKey(f, i)]"
                      (change)="setCustomValue(f, i, $event.target.checked)"
                    />
                    <span>Yes</span>
                  </label>
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

                <div class="form-actions">
                  <button class="btn primary compact" type="submit" [disabled]="f.invalid || submitting">
                    {{ submitting ? (isFreeEvent ? 'Booking...' : 'Redirecting to payment...') : (isFreeEvent ? 'Book Ticket' : 'Proceed to Payment') }}
                  </button>
                  <button class="btn ghost compact" type="button" (click)="onCancelBooking()">Cancel</button>
                </div>
              </form>
            </ng-template>

            <div
              class="booking-modal-backdrop"
              *ngIf="showBookingForm"
              (click)="closeBooking()"
            >
              <div class="booking-modal" (click)="$event.stopPropagation()">
                <div class="booking-modal-header">
                  <div class="modal-title">Book Tickets</div>
                  <button class="modal-close" type="button" (click)="closeBooking()">&times;</button>
                </div>
                <div *ngIf="msg" class="msg">{{ msg }}</div>
                <div class="booking-modal-body">
                  <ng-container *ngTemplateOutlet="bookingForm"></ng-container>
                </div>
              </div>
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
      .template-clean-hero .overlay {
        background: radial-gradient(circle at top left, rgba(15, 23, 42, 0.6), rgba(2, 6, 23, 0.85));
      }
      .template-bold-split .overlay {
        background: linear-gradient(120deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.5));
      }
      .template-editorial .overlay {
        background: linear-gradient(140deg, rgba(17, 24, 39, 0.85), rgba(2, 6, 23, 0.7));
      }
      .overlay {
        position: absolute;
        inset: 0;
        backdrop-filter: blur(4px);
      }
      .content {
        position: relative;
        z-index: 2;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px 18px 48px;
      }

      .details-wrap {
        width: 100%;
        max-width: 1040px;
        margin: 0 auto;
        color: #f8fafc;
      }

      .title {
        margin: 6px 0;
        font-size: 30px;
        letter-spacing: 0.2px;
      }

      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .kicker.glow {
        color: #fda4af;
        border-color: rgba(253, 164, 175, 0.4);
      }

      .desc {
        margin-top: 10px;
        color: rgba(248, 250, 252, 0.85);
        line-height: 1.6;
      }

      .layout {
        display: grid;
        gap: 18px;
      }

      .section {
        margin-top: 14px;
      }

      .section-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(248, 250, 252, 0.65);
        margin-bottom: 8px;
      }

      .hero-media {
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(15, 23, 42, 0.4);
        aspect-ratio: 16 / 9;
      }
      .hero-media.square {
        aspect-ratio: 4 / 3;
      }
      .hero-media.wide {
        aspect-ratio: 16 / 8;
      }
      .hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .poster-fallback {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(248, 250, 252, 0.8);
        font-weight: 700;
        background: rgba(2, 6, 23, 0.35);
      }

      .chip-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.12);
      }

      .meta-line {
        font-size: 13px;
        color: rgba(248, 250, 252, 0.8);
        margin: 4px 0;
      }

      .price-row {
        margin-top: 10px;
        font-size: 20px;
        font-weight: 800;
      }

      .meta-stack {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 18px;
      }
      .meta-item {
        display: grid;
        gap: 4px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.16);
        font-size: 13px;
      }
      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(248, 250, 252, 0.6);
      }

      .ticket-card,
      .price-card,
      .card {
        padding: 16px;
        border-radius: 18px;
        background: rgba(2, 6, 23, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 20px 50px rgba(2, 6, 23, 0.45);
        backdrop-filter: blur(12px);
      }

      .price-card {
        display: grid;
        gap: 6px;
        text-align: left;
      }
      .price-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(248, 250, 252, 0.6);
      }
      .price-amount {
        font-size: 28px;
        font-weight: 800;
      }
      .mini-meta {
        font-size: 12px;
        color: rgba(248, 250, 252, 0.7);
      }

      .template-tag {
        display: inline-flex;
        margin: 6px 0 12px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.22);
      }

      .card-title {
        margin: 0 0 10px;
        color: #0b0f17;
        font-weight: 800;
      }

      .form-group {
        margin-bottom: 12px;
      }
      label {
        display: block;
        margin-bottom: 6px;
        color: rgba(248, 250, 252, 0.9);
      }

      .form-control {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        outline: none;
        background: rgba(15, 23, 42, 0.6);
        color: #f8fafc;
      }
      .form-control::placeholder {
        color: rgba(248, 250, 252, 0.55);
      }
      .check-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: rgba(248, 250, 252, 0.9);
      }
      .req {
        color: #fca5a5;
        margin-left: 6px;
      }

      .btn {
        padding: 12px 14px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        background: #16a34a;
        color: #fff;
        width: 100%;
        font-weight: 600;
      }
      .btn.primary {
        background: linear-gradient(135deg, var(--theme-color, #f97316), #facc15);
        border: 1px solid rgba(249, 115, 22, 0.4);
      }

      .btn.ghost {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.24);
        color: #fff;
      }

      .btn.compact {
        padding: 8px 12px;
        font-size: 13px;
        width: auto;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        align-items: center;
      }

      .form-actions .btn {
        flex: 0 0 auto;
      }

      .movie-layout {
        grid-template-columns: 1.15fr 0.85fr;
      }

      .concert-layout {
        gap: 18px;
      }
      .concert-hero {
        position: relative;
        border-radius: 20px;
        overflow: hidden;
        min-height: 280px;
        background-size: cover;
        background-position: center;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .concert-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, rgba(2, 6, 23, 0.9), rgba(2, 6, 23, 0.15));
      }
      .concert-content {
        position: relative;
        z-index: 1;
        padding: 18px;
        max-width: 520px;
      }
      .concert-body {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 16px;
      }

      .comedy-layout .comedy-card {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 16px;
        padding: 16px;
        border-radius: 20px;
        background: rgba(17, 24, 39, 0.6);
        border: 1px solid rgba(250, 204, 21, 0.35);
      }
      .comedy-right {
        display: grid;
        gap: 10px;
        align-content: start;
      }

      .default-layout {
        grid-template-columns: 1.1fr 0.9fr;
      }
      .default-right {
        display: grid;
        gap: 16px;
        align-content: start;
      }
      .booking-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 23, 0.6);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 50;
      }

      .booking-modal {
        width: min(560px, 100%);
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 18px;
        box-shadow: 0 30px 80px rgba(2, 6, 23, 0.6);
        padding: 18px;
      }

      .booking-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .modal-title {
        font-size: 18px;
        font-weight: 700;
      }

      .modal-close {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: grid;
        place-items: center;
        font-size: 18px;
        line-height: 1;
      }

      .booking-modal-body {
        max-height: 70vh;
        overflow: auto;
        padding-right: 4px;
      }

      @media (max-width: 980px) {
        .movie-layout,
        .concert-body,
        .comedy-layout .comedy-card,
        .default-layout {
          grid-template-columns: 1fr;
        }
        .meta-stack {
          grid-template-columns: 1fr;
        }
      }

      .msg {
        margin: 10px 0;
        padding: 10px 12px;
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
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.3);
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
  phone = '';
  experience = '';
  skillLevel = '';
  company = '';
  designation = '';
  customFieldValues: Record<string, any> = {};

  submitting = false;
  msg = '';
  showBookingForm = false;

  private BASE = 'http://localhost:5000';
  bgStyle: Record<string, string> = {};

  get registrationTemplate(): string {
    return this.event?.registrationTemplate || 'standard';
  }

  get isStandard(): boolean {
    return this.registrationTemplate === 'standard';
  }

  get isWorkshop(): boolean {
    return this.registrationTemplate === 'workshop';
  }

  get isSeminar(): boolean {
    return this.registrationTemplate === 'seminar';
  }

  get registrationTemplateLabel(): string {
    if (this.isWorkshop) return 'Workshop Form';
    if (this.isSeminar) return 'Seminar Form';
    return 'Standard Registration';
  }

  get designTemplateClass(): string {
    const t = this.event?.designTemplate || 'clean-hero';
    if (t === 'bold-split') return 'template-bold-split';
    if (t === 'editorial') return 'template-editorial';
    return 'template-clean-hero';
  }

  get designTemplateKey(): string {
    return String(this.event?.designTemplate || 'clean-hero').toLowerCase();
  }

  get designTemplateLabel(): string {
    const t = this.event?.designTemplate || 'clean-hero';
    if (t === 'movie') return 'Movie Showcase';
    if (t === 'concert') return 'Concert Night';
    if (t === 'comedy') return 'Comedy Spotlight';
    if (t === 'bold-split') return 'Bold Split Layout';
    if (t === 'editorial') return 'Editorial Layout';
    return 'Clean Hero Layout';
  }

  get eventImageUrl(): string {
    const id = this.event?._id || this.event?.id;
    return id ? `${this.BASE}/api/events/${id}/image` : '';
  }

  get designConfig(): any {
    return this.event?.designConfig || {};
  }

  get designThemeColor(): string {
    return this.designConfig?.themeColor || '#ef4444';
  }

  get isFreeEvent(): boolean {
    if (!this.event) return false;
    const paiseLike = Number(this.event?.unitAmount ?? this.event?.pricePaise ?? this.event?.ticketPricePaise);
    if (Number.isFinite(paiseLike) && paiseLike > 0) return false;
    const rupeesLike = Number(this.event?.price ?? this.event?.ticketPrice ?? this.event?.amount);
    if (Number.isFinite(rupeesLike)) return rupeesLike <= 0;
    return false;
  }

  get customFields(): any[] {
    return Array.isArray(this.event?.customFields) ? this.event.customFields : [];
  }

  fieldKey(field: any, index: number): string {
    const base = String(field?.label || '').trim().toLowerCase().replace(/\s+/g, '_');
    return base ? `${base}_${index}` : `field_${index}`;
  }

  setCustomValue(field: any, index: number, value: any) {
    const key = this.fieldKey(field, index);
    this.customFieldValues[key] = value;
  }

  isTextType(type: string): boolean {
    return ['text', 'email', 'phone', 'number'].includes(type);
  }

  inputTypeFor(type: string): string {
    if (type === 'email') return 'email';
    if (type === 'number') return 'number';
    return 'text';
  }

  openBooking() {
    this.showBookingForm = true;
    this.msg = '';
  }

  closeBooking() {
    this.showBookingForm = false;
  }

  onCancelBooking() {
    this.closeBooking();
    const el = document.querySelector('.details-wrap');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

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
    this.showBookingForm = false;

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

    if (!this.name.trim() || !this.email.trim()) {
      this.msg = '❌ Name and Email are required.';
      return;
    }

    if (this.isStandard && !this.phone.trim()) {
      this.msg = '❌ Phone is required for standard registration.';
      return;
    }
    if (this.isWorkshop && (!this.experience.trim() || !this.skillLevel)) {
      this.msg = '❌ Experience and skill level are required for workshop registration.';
      return;
    }
    if (this.isSeminar && (!this.company.trim() || !this.designation.trim())) {
      this.msg = '❌ Company and designation are required for seminar registration.';
      return;
    }

    if (!this.validateCustomFields()) {
      this.msg = '❌ Please complete all required custom fields.';
      return;
    }


    const unitAmount = this.toUnitAmountPaise();
    const isFree = this.isFreeEvent;
    if (!unitAmount && !isFree) {
      this.msg = 'Error: Ticket price missing in event. Please set event price in backend.';
      return;
    }

    this.submitting = true;
    this.msg = '';

    if (isFree) {
      this.bs
        .createBooking({
          eventId,
          name: this.name,
          email: this.email,
          seats: qty,
          registrationTemplate: this.registrationTemplate,
          registrationData: {
            phone: this.phone,
            experience: this.experience,
            skillLevel: this.skillLevel,
            company: this.company,
            designation: this.designation,
            customFields: this.customFieldValues,
          },
        })
        .subscribe({
          next: (res: any) => {
            this.submitting = false;
            const ticketId = res?.ticketId || res?.booking?.ticketId;
            if (ticketId) {
              this.closeBooking();
              this.router.navigate(['/booking', ticketId]);
              return;
            }
            this.msg = 'Error: Booking created but ticket id missing.';
          },
          error: (err: any) => {
            this.submitting = false;
            this.msg = err?.error?.message || 'Booking failed';
            console.error('create-booking error:', err);
          },
        });
      return;
    }

    this.bs
      .createCheckoutSession({
        eventId,
        ticketName: this.event?.title || 'Event Ticket',
        quantity: qty,
        unitAmount,
        currency: 'inr',
        name: this.name,
        email: this.email,
        registrationTemplate: this.registrationTemplate,
        registrationData: {
          phone: this.phone,
          experience: this.experience,
          skillLevel: this.skillLevel,
          company: this.company,
          designation: this.designation,
          customFields: this.customFieldValues,
        },
      })
      .subscribe({
        next: (res: any) => {
          this.submitting = false;

          const url = res?.url;
          if (url) {
            window.location.href = url;
            return;
          }

          this.msg = 'Error: Payment session not created (missing url).';
        },
        error: (err: any) => {
          this.submitting = false;
          this.msg = err?.error?.message || 'Payment init failed';
          console.error('create-checkout-session error:', err);
        },
      });

  }

  private validateCustomFields(): boolean {
    if (!this.customFields.length) return true;
    for (let i = 0; i < this.customFields.length; i++) {
      const field = this.customFields[i];
      if (!field?.required) continue;
      const key = this.fieldKey(field, i);
      const value = this.customFieldValues[key];
      if (field.type === 'checkbox') {
        if (!value) return false;
      } else if (value == null || String(value).trim() === '') {
        return false;
      }
    }
    return true;
  }
}


















