// src/app/pages/event-details/event-details.component.ts âœ… UPDATED (Stripe redirect + safer booking)

import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';

import { EventService } from '../../services/event.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../auth/auth.service';
import { PromotionRecord, PromotionService } from '../../services/promotion.service';
import { MovieService } from '../../services/movie.service';
import { MovieRecommendationItem } from '../../models/movie.model';

@Component({
  standalone: true,
  selector: 'app-event-details',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.css'],
})
export class EventDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private es = inject(EventService);
  private bs = inject(BookingService);
  private authService = inject(AuthService);
  private promotionService = inject(PromotionService);
  private movieService = inject(MovieService);
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

  selectedShowDate = '';
  selectedShowTime = '';

  submitting = false;
  msg = '';
  showBookingForm = false;
  claimablePromotions: PromotionRecord[] = [];
  claimedPromotions: PromotionRecord[] = [];
  selectedPromotionId = '';

  eventImgFailed = false;
  movieRecommendations: MovieRecommendationItem[] = [];
  movieRecommendationLoading = false;
  movieRecommendationError = '';

  private BASE = environment.apiUrl;
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

  get eventTagline(): string {
    return this.event?.tagline || 'Everything you need to know about this event, from vibe to booking, in one focused page.';
  }

  get formattedEventDate(): string {
    if (!this.event?.date) return 'Date to be announced';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(this.event.date));
  }

  get formattedEventTime(): string {
    if (!this.event?.date) return 'Time to be announced';
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(this.event.date));
  }

  get displayVenue(): string {
    return this.event?.venue || (this.event?.locationType === 'Virtual' ? 'Online event' : 'Venue to be announced');
  }

  get bookingPriceLabel(): string {
    return this.isFreeEvent ? 'Free' : `Rs ${this.unitPriceRupees}`;
  }

  get aboutSnippet(): string {
    const raw = String(this.event?.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return 'Event details, highlights, and the full story will appear here.';
    return raw.length > 120 ? `${raw.slice(0, 120)}...` : raw;
  }

  get bookingAssistText(): string {
    return this.isFreeEvent ? 'Free booking available for attendees.' : `Tickets currently start from Rs ${this.unitPriceRupees}.`;
  }

  get eventHighlights(): Array<{ label: string; value: string }> {
    return [
      { label: 'Language', value: this.event?.language || 'English' },
      { label: 'Age', value: this.event?.ageRestriction || 'All Ages' },
      { label: 'Seats', value: `${this.event?.totalSeats ?? 0}` },
      { label: 'Mode', value: this.event?.locationType || 'In-person' },
    ];
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
    return this.es.getEventImageUrl(this.event);
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

  get currentUser(): any {
    return this.authService.getUser();
  }

  get eventId(): string {
    return String(this.event?._id || this.event?.id || '');
  }

  get selectedPromotion(): PromotionRecord | null {
    return this.claimedPromotions.find((item) => item.id === this.selectedPromotionId) || null;
  }

  get unitPriceRupees(): number {
    const paise = this.toUnitAmountPaise();
    if (paise > 0) return Math.round(paise / 100);
    const rupees = Number(this.event?.price ?? this.event?.ticketPrice ?? this.event?.amount ?? 0);
    return Number.isFinite(rupees) ? Math.max(0, Math.round(rupees)) : 0;
  }

  get subtotalRupees(): number {
    const qty = Number(this.seats);
    return this.unitPriceRupees * (Number.isFinite(qty) && qty > 0 ? qty : 1);
  }

  get discountRupees(): number {
    return this.promotionService.calculateDiscount(this.subtotalRupees, this.selectedPromotion);
  }

  get finalPayableRupees(): number {
    return Math.max(0, this.subtotalRupees - this.discountRupees);
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
    this.ensureDefaultShowSelection();
    this.refreshPromotions();
  }

  closeBooking() {
    this.showBookingForm = false;
  }

  claimPromotion(id: string): void {
    const result = this.promotionService.claimPromotion(id, this.currentUser);
    this.msg = result.message;
    this.refreshPromotions();
    if (result.ok && result.promotion) {
      this.selectedPromotionId = result.promotion.id;
    }
  }

  promotionCaption(item: PromotionRecord): string {
    return this.promotionService.describePromotion(item);
  }

  private refreshPromotions(): void {
    if (!this.currentUser || !this.eventId) {
      this.claimablePromotions = [];
      this.claimedPromotions = [];
      this.selectedPromotionId = '';
      return;
    }

    this.claimablePromotions = this.promotionService.listClaimableForUser(this.currentUser, this.eventId);
    this.claimedPromotions = this.promotionService.listClaimedForUser(this.currentUser, this.eventId);

    if (this.selectedPromotionId && !this.claimedPromotions.some((item) => item.id === this.selectedPromotionId)) {
      this.selectedPromotionId = '';
    }
  }

  get showDateOptions(): string[] {
    const ev = this.event;
    if (!ev) return [];

    const startYmd = String(ev.startDate || ev.date || '').slice(0, 10);
    const endYmd = String(ev.endDate || ev.startDate || ev.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) {
      return [];
    }

    const start = new Date(`${startYmd}T00:00:00.000Z`);
    const end = new Date(`${endYmd}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const maxDays = 120;
    const out: string[] = [];
    const cur = new Date(start);
    let count = 0;

    while (cur.getTime() <= end.getTime() && count < maxDays) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cur.getUTCDate()).padStart(2, '0');
      out.push(`${y}-${m}-${d}`);
      cur.setUTCDate(cur.getUTCDate() + 1);
      count += 1;
    }

    return out;
  }

  get showTimeOptions(): string[] {
    const ev = this.event;
    if (!ev) return [];

    const list = Array.isArray(ev.showTimes) ? ev.showTimes : [];
    const normalized = list.map((t: any) => String(t || '').trim()).filter(Boolean);
    if (normalized.length) return normalized;

    const legacyIso = ev.date;
    const d = legacyIso ? new Date(legacyIso) : null;
    if (!d || Number.isNaN(d.getTime())) return [];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return [`${hh}:${mm}`];
  }

  private ensureDefaultShowSelection() {
    const dates = this.showDateOptions;
    const times = this.showTimeOptions;

    if (!this.selectedShowDate && dates.length) this.selectedShowDate = dates[0];
    if (!this.selectedShowTime && times.length) this.selectedShowTime = times[0];

    if (this.selectedShowDate && dates.length && !dates.includes(this.selectedShowDate)) {
      this.selectedShowDate = dates[0];
    }
    if (this.selectedShowTime && times.length && !times.includes(this.selectedShowTime)) {
      this.selectedShowTime = times[0];
    }
  }

  private buildShowAtIso(): string | null {
    this.ensureDefaultShowSelection();
    if (!this.selectedShowDate || !this.selectedShowTime) return null;
    const d = new Date(`${this.selectedShowDate}T${this.selectedShowTime}:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  onEventImgError() {
    this.eventImgFailed = true;
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
        this.ensureDefaultShowSelection();
        this.refreshPromotions();

        this.eventImgFailed = false;

        const full = this.es.getEventImageUrl(ev);

        this.bgStyle = full ? { 'background-image': `url('${full}')` } : {};
        this.loadMovieRecommendations(String(ev?.title || ''));

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
    if (this.submitting) return; // âœ… prevent double clicks

    const eventId = this.event._id || this.event.id;
    if (!eventId) {
      this.msg = 'Event id missing.';
      return;
    }

    const qty = Number(this.seats);
    if (!Number.isInteger(qty) || qty < 1) {
      this.msg = 'âŒ Seats must be at least 1.';
      return;
    }

    if (!this.name.trim() || !this.email.trim()) {
      this.msg = 'âŒ Name and Email are required.';
      return;
    }

    if (this.isStandard && !this.phone.trim()) {
      this.msg = 'âŒ Phone is required for standard registration.';
      return;
    }
    if (this.isWorkshop && (!this.experience.trim() || !this.skillLevel)) {
      this.msg = 'âŒ Experience and skill level are required for workshop registration.';
      return;
    }
    if (this.isSeminar && (!this.company.trim() || !this.designation.trim())) {
      this.msg = 'âŒ Company and designation are required for seminar registration.';
      return;
    }

    if (!this.validateCustomFields()) {
      this.msg = 'âŒ Please complete all required custom fields.';
      return;
    }

    const showAtIso = this.buildShowAtIso();
    if (!showAtIso) {
      this.msg = 'âŒ Please select show date and time.';
      return;
    }

    const originalUnitAmount = this.toUnitAmountPaise();
    const baseIsFree = this.isFreeEvent;
    if (!originalUnitAmount && !baseIsFree) {
      this.msg = 'Error: Ticket price missing in event. Please set event price in backend.';
      return;
    }

    const subtotalPaise = Math.max(0, Math.round(this.subtotalRupees * 100));
    const discountPaise = Math.max(0, Math.round(this.discountRupees * 100));
    const finalPaise = Math.max(0, subtotalPaise - discountPaise);
    const discountedUnitAmount = qty > 0 ? Math.floor(finalPaise / qty) : originalUnitAmount;
    const isFree = baseIsFree || finalPaise <= 0;

    this.submitting = true;
    this.msg = '';

    if (isFree) {
      this.bs
        .createBooking({
          eventId,
          name: this.name,
          email: this.email,
          seats: qty,
          showAt: showAtIso,
          promotionId: this.selectedPromotion?.id || null,
          promotionCode: this.selectedPromotion?.code || null,
          discountAmount: this.discountRupees,
          finalAmount: this.finalPayableRupees,
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
        unitAmount: discountedUnitAmount,
        currency: 'inr',
        name: this.name,
        email: this.email,
        showAt: showAtIso,
        promotionId: this.selectedPromotion?.id || null,
        promotionCode: this.selectedPromotion?.code || null,
        discountAmount: this.discountRupees,
        finalAmount: this.finalPayableRupees,
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

  private loadMovieRecommendations(title: string): void {
    const query = title.trim();
    if (!query) {
      this.movieRecommendations = [];
      this.movieRecommendationError = '';
      this.movieRecommendationLoading = false;
      return;
    }

    this.movieRecommendationLoading = true;
    this.movieRecommendationError = '';
    this.movieRecommendations = [];

    this.movieService.getRecommendations(query, 8).subscribe({
      next: (response) => {
        this.movieRecommendationLoading = false;
        this.movieRecommendations = Array.isArray(response.recommendations)
          ? response.recommendations
          : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.movieRecommendationLoading = false;
        this.movieRecommendations = [];
        this.movieRecommendationError =
          'Movie recommendations will appear here once the event title matches the movie dataset.';
        this.cdr.detectChanges();
      },
    });
  }

  moviePosterStyle(movie: MovieRecommendationItem): Record<string, string> {
    return movie.posterUrl ? { 'background-image': `url('${movie.posterUrl}')` } : {};
  }

  openRecommendedMovie(movie: MovieRecommendationItem): void {
    const movieId = String(movie?.movieId || '').trim();
    if (!movieId) return;

    this.es.getMovieEvent(movieId).subscribe({
      next: (event) => {
        const eventId = event?._id || event?.id;
        if (eventId) {
          this.router.navigate(['/events', eventId]);
          return;
        }
        this.router.navigate(['/movies', movieId]);
      },
      error: () => {
        this.router.navigate(['/movies', movieId]);
      },
    });
  }
}
