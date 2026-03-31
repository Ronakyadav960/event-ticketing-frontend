import { Component, OnDestroy, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { Subject, takeUntil } from 'rxjs';
import { HeroCarouselComponent } from '../../shared/hero-carousel/hero-carousel.component';

@Component({
  standalone: true,
  selector: 'app-events',
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, HeroCarouselComponent],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
})
export class EventsComponent implements OnInit, OnDestroy {
  private es = inject(EventService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  loading = false;
  loadingMore = false;
  error = '';
  events: any[] = [];
  categories: string[] = [];
  private page = 1;
  private readonly pageSize = 12;
  hasMore = true;
  private activeCategoryParam = '';
  private observer?: IntersectionObserver;

  @ViewChild('sentinel') set sentinelRef(el: ElementRef<HTMLDivElement> | undefined) {
    if (!el) return;
    this.setupObserver(el.nativeElement);
  }

  // UI state
  q = '';
  status: 'all' | 'upcoming' | 'past' | 'soldout' = 'all';
  sort: 'dateAsc' | 'dateDesc' | 'priceAsc' | 'priceDesc' = 'dateAsc';
  categoryFilter = 'all';

  private imgErrorIds = new Set<string>();


  ngOnInit(): void {
    this.loadCategories();
    this.fetchEvents('', true);

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const q = params.get('q');
      this.q = q ? q : '';
    });
  }

    loadCategories(): void {
    this.es.getCategories().subscribe({
      next: (list: string[]) => {
        this.categories = Array.isArray(list) ? list : [];
      },
      error: () => {
        this.categories = [];
      }
    });
  }
  selectCategory(value: string) {
    this.categoryFilter = value;
    const categoryParam = value === 'all' ? '' : value;
    this.activeCategoryParam = categoryParam;
    this.fetchEvents(categoryParam, true);
  }
  fetchEvents(category?: string, reset = false): void {
    if (!reset && (!this.hasMore || this.loadingMore)) return;

    if (reset) {
      this.page = 1;
      this.hasMore = true;
      this.events = [];
    }

    if (reset) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    this.error = '';

    this.es.getAllEvents(category, this.page, this.pageSize).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.events = reset ? list : [...this.events, ...list];
        const totalPages = Number(res?.totalPages) || 1;
        const currentPage = Number(res?.page) || this.page;
        this.hasMore = currentPage < totalPages && list.length > 0;
        this.page = currentPage + 1;
        if (reset) this.imgErrorIds.clear();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load events.';
      },
      complete: () => {
        this.loading = false;
        this.loadingMore = false;
      },
    });
  }

  private eventIdOf(e: any): string {
    return String(e?._id || e?.id || '');
  }

  imgUrl(e: any): string {
    return this.es.getEventImageUrl(e);
  }

  onImgError(e: any): void {
    const id = this.eventIdOf(e);
    if (!id) return;
    this.imgErrorIds.add(id);
  }

  shouldShowImg(e: any): boolean {
    const id = this.eventIdOf(e);
    if (!id) return false;
    return !!this.imgUrl(e) && !this.imgErrorIds.has(id);
  }


  remainingSeats(e: any): number {
    const total = Number(e?.totalSeats ?? 0);
    const booked = Number(e?.bookedSeats ?? 0);
    const left = total - booked;
    return isNaN(left) ? 0 : Math.max(0, left);
  }

  statusOf(e: any): 'Upcoming' | 'Past' | 'Sold Out' {
    const left = this.remainingSeats(e);
    if (left <= 0) return 'Sold Out';
    const d = new Date(e?.date);
    if (!isNaN(d.getTime()) && d.getTime() < Date.now()) return 'Past';
    return 'Upcoming';
  }

  get filtered(): any[] {
    const text = this.q.trim().toLowerCase();

    let list = this.events.filter((e) => {
      const title = (e?.title || '').toLowerCase();
      const venue = (e?.venue || '').toLowerCase();
      const matchesText = !text || title.includes(text) || venue.includes(text);

      const st = this.statusOf(e);
      const matchesStatus =
        this.status === 'all' ||
        (this.status === 'upcoming' && st === 'Upcoming') ||
        (this.status === 'past' && st === 'Past') ||
        (this.status === 'soldout' && st === 'Sold Out');

      const matchesCategory = this.matchesCategory(e);

      return matchesText && matchesStatus && matchesCategory;
    });

    list = list.sort((a, b) => {
      const da = new Date(a?.date || 0).getTime();
      const db = new Date(b?.date || 0).getTime();
      const pa = Number(a?.price ?? 0);
      const pb = Number(b?.price ?? 0);

      switch (this.sort) {
        case 'dateAsc': return da - db;
        case 'dateDesc': return db - da;
        case 'priceAsc': return pa - pb;
        case 'priceDesc': return pb - pa;
        default: return 0;
      }
    });

    return list;
  }

  private matchesCategory(e: any): boolean {
    if (this.categoryFilter === 'all') return true;
    const category = String(e?.category || '').toLowerCase();
    const target = String(this.categoryFilter || '').toLowerCase();
    return category === target;
  }

  openEvent(e: any): void {
    const id = e?._id || e?.id;
    if (!id) return;
    this.router.navigate(['/events', id]);
  }

  eventCardClass(e: any): string {
    const t = String(e?.designTemplate || '').toLowerCase();
    if (t === 'movie') return 'card-variant-movie';
    if (t === 'concert') return 'card-variant-concert';
    if (t === 'comedy') return 'card-variant-comedy';
    if (t === 'bold-split') return 'card-variant-bold';
    if (t === 'editorial') return 'card-variant-editorial';
    if (t === 'clean-hero') return 'card-variant-clean';
    return 'card-variant-clean';
  }

  private setupObserver(target: HTMLDivElement) {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.fetchEvents(this.activeCategoryParam, false);
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    this.observer.observe(target);
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }
}





