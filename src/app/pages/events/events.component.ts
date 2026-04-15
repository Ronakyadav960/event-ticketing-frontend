import { Component, OnDestroy, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EventService } from '../../services/event.service';
import { Subject, takeUntil } from 'rxjs';
import { HeroCarouselComponent } from '../../shared/hero-carousel/hero-carousel.component';
import { MovieService } from '../../services/movie.service';
import { MovieRecommendationItem } from '../../models/movie.model';

@Component({
  standalone: true,
  selector: 'app-events',
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, HeroCarouselComponent],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
})
export class EventsComponent implements OnInit, OnDestroy {
  private es = inject(EventService);
  private movieService = inject(MovieService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private movieSearchToken = 0;
  private matchedEventsToken = 0;

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
  private movieObserver?: IntersectionObserver;
  private moviePage = 1;
  private readonly moviePageSize = 12;
  movieHasMore = true;
  movieListLoading = false;
  movieListLoadingMore = false;
  movieListError = '';
  movies: MovieRecommendationItem[] = [];

  @ViewChild('sentinel') set sentinelRef(el: ElementRef<HTMLDivElement> | undefined) {
    if (!el) return;
    this.setupObserver(el.nativeElement);
  }

  @ViewChild('movieSentinel') set movieSentinelRef(el: ElementRef<HTMLDivElement> | undefined) {
    if (!el) return;
    this.setupMovieObserver(el.nativeElement);
  }

  // UI state
  q = '';
  status: 'all' | 'upcoming' | 'past' | 'soldout' = 'all';
  sort: 'dateAsc' | 'dateDesc' | 'priceAsc' | 'priceDesc' = 'dateAsc';
  categoryFilter = 'all';
  movieSearchActive = false;
  selectedMovie: MovieRecommendationItem | null = null;
  movieRecommendations: MovieRecommendationItem[] = [];
  recommendationLoading = false;
  recommendationError = '';
  closestMatchNote = '';
  matchedEventsLoading = false;
  matchedEventsError = '';
  matchedEvents: any[] = [];
  searchError = '';
  quickMatches: MovieRecommendationItem[] = [];

  private imgErrorIds = new Set<string>();


  ngOnInit(): void {
    this.loadCategories();
    this.fetchEvents('', true);
    this.loadMovies(true);

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.handleMovieSearch(query);
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
    this.clearMovieSearchState();
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

  onSearchChange(value: string): void {
    this.q = value;
    this.searchInput$.next(value);
  }

  openMovie(movie: MovieRecommendationItem): void {
    if (!movie.movieId) return;
    this.es.getMovieEvent(movie.movieId).subscribe({
      next: (event) => {
        const eventId = event?._id || event?.id;
        if (eventId) {
          this.router.navigate(['/events', eventId]);
          return;
        }
        this.router.navigate(['/movies', movie.movieId]);
      },
      error: () => {
        this.router.navigate(['/movies', movie.movieId]);
      },
    });
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

  private setupMovieObserver(target: HTMLDivElement) {
    if (this.movieObserver) this.movieObserver.disconnect();

    this.movieObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !this.movieSearchActive) {
          this.loadMovies(false);
        }
      },
      { rootMargin: '240px 0px', threshold: 0.1 }
    );

    this.movieObserver.observe(target);
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.movieObserver) this.movieObserver.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackMovie(_: number, movie: MovieRecommendationItem): string {
    return movie.movieId || movie.title;
  }

  moviePosterStyle(movie: MovieRecommendationItem): Record<string, string> {
    return movie.posterUrl ? { 'background-image': `url('${movie.posterUrl}')` } : {};
  }

  private handleMovieSearch(query: string): void {
    const requestToken = ++this.movieSearchToken;
    const normalized = query.trim();
    this.movieSearchActive = !!normalized;

    if (!normalized) {
      this.searchError = '';
      this.selectedMovie = null;
      this.movieRecommendations = [];
      this.quickMatches = [];
      this.recommendationLoading = false;
      this.recommendationError = '';
      this.closestMatchNote = '';
      this.matchedEventsLoading = false;
      this.matchedEventsError = '';
      this.matchedEvents = [];
      if (this.categoryFilter === 'all') {
        this.loadMovies(true);
      }
      return;
    }

    if (normalized.length < 2) {
      this.searchError = 'At least 2 characters enter karo.';
      this.selectedMovie = null;
      this.movieRecommendations = [];
      this.quickMatches = [];
      this.recommendationLoading = false;
      this.recommendationError = '';
      this.closestMatchNote = '';
      this.matchedEventsLoading = false;
      this.matchedEventsError = '';
      this.matchedEvents = [];
      return;
    }

    this.searchError = '';
    this.recommendationLoading = true;
    this.recommendationError = '';
    this.closestMatchNote = '';
    this.selectedMovie = null;
    this.quickMatches = [];
    this.matchedEvents = [];
    this.matchedEventsError = '';
    this.movies = [];
    this.movieHasMore = false;

    this.movieService.searchMovies(normalized, 8).subscribe({
      next: (searchResponse) => {
        if (requestToken !== this.movieSearchToken || this.q.trim() !== normalized) return;

        const matches = Array.isArray(searchResponse.results) ? searchResponse.results : [];
        this.quickMatches = matches;

        const selected =
          searchResponse.closestMatch ||
          matches.find((movie) => movie.title.trim().toLowerCase() === normalized.toLowerCase()) ||
          matches[0] ||
          null;

        if (!selected) {
          this.recommendationLoading = false;
          this.selectedMovie = null;
          this.movieRecommendations = [];
          this.recommendationError = 'Movie not found in dataset.';
          return;
        }

        this.selectedMovie = selected;
        this.loadMatchedEvents(selected, normalized);

        this.movieService.getRecommendations(selected.title, 6).subscribe({
          next: (response) => {
            if (requestToken !== this.movieSearchToken || this.q.trim() !== normalized) return;
            this.recommendationLoading = false;
            this.selectedMovie = response.selected || response.closestMatch || selected;
            this.loadMatchedEvents(this.selectedMovie, normalized);
            this.movieRecommendations = Array.isArray(response.recommendations)
              ? response.recommendations
              : [];
            this.quickMatches = Array.isArray(response.suggestions) && response.suggestions.length
              ? response.suggestions
              : matches;
            this.recommendationError = this.movieRecommendations.length
              ? ''
              : 'No recommendations found for this movie yet.';
            this.closestMatchNote =
              response.exactMatch === false && this.selectedMovie
                ? `Closest match used: ${this.selectedMovie.title}`
                : '';
          },
          error: () => {
            if (requestToken !== this.movieSearchToken || this.q.trim() !== normalized) return;
            this.recommendationLoading = false;
            this.movieRecommendations = [];
            this.quickMatches = matches;
            this.recommendationError = 'Recommendations are not available for this movie yet.';
            this.loadMatchedEvents(selected, normalized);
          },
        });
      },
      error: (error) => {
        if (requestToken !== this.movieSearchToken || this.q.trim() !== normalized) return;
        this.recommendationLoading = false;
        this.selectedMovie = null;
        this.movieRecommendations = [];
        this.quickMatches = [];
        this.recommendationError = '';
        this.searchError = error?.error?.message || 'Movie search failed.';
      },
    });
  }

  private loadMovies(reset: boolean): void {
    if (!reset && (!this.movieHasMore || this.movieListLoadingMore || this.movieSearchActive)) return;

    if (reset) {
      this.moviePage = 1;
      this.movieHasMore = true;
      this.movies = [];
      this.movieListLoading = true;
    } else {
      this.movieListLoadingMore = true;
    }

    this.movieListError = '';

    this.movieService.getMovies('', this.moviePage, this.moviePageSize).subscribe({
      next: (response) => {
        const list = Array.isArray(response.data) ? response.data : [];
        this.movies = reset ? list : [...this.movies, ...list];
        this.movieHasMore = !!response.hasMore;
        this.moviePage = (Number(response.page) || this.moviePage) + 1;
      },
      error: (error) => {
        this.movieListError = error?.error?.message || 'Movie catalog could not be loaded.';
      },
      complete: () => {
        this.movieListLoading = false;
        this.movieListLoadingMore = false;
      },
    });
  }

  private clearMovieSearchState(): void {
    this.q = '';
    this.movieSearchActive = false;
    this.selectedMovie = null;
    this.movieRecommendations = [];
    this.quickMatches = [];
    this.recommendationLoading = false;
    this.recommendationError = '';
    this.closestMatchNote = '';
    this.matchedEventsLoading = false;
    this.matchedEventsError = '';
    this.matchedEvents = [];
    this.searchError = '';

    if (this.categoryFilter === 'all') {
      this.loadMovies(true);
      return;
    }

    this.movieListLoading = false;
    this.movieListLoadingMore = false;
    this.movieListError = '';
    this.movies = [];
    this.movieHasMore = false;
  }

  private loadMatchedEvents(movie: MovieRecommendationItem | null, fallbackQuery: string): void {
    const requestToken = ++this.matchedEventsToken;
    const movieId = String(movie?.movieId || '').trim();
    const title = String(movie?.title || fallbackQuery || '').trim();

    if (!movieId && !title) {
      this.matchedEventsLoading = false;
      this.matchedEventsError = '';
      this.matchedEvents = [];
      return;
    }

    this.matchedEventsLoading = true;
    this.matchedEventsError = '';

    const request$ = movieId
      ? this.es.getAllEvents(undefined, 1, 12, undefined, movieId)
      : this.es.getAllEvents(undefined, 1, 12, title);

    request$.subscribe({
      next: (response) => {
        if (requestToken !== this.matchedEventsToken) return;
        const list = Array.isArray(response?.data) ? response.data : [];
        const normalizedTitle = title.toLowerCase();
        this.matchedEvents = list.filter((event: any) => {
          const sourceMovieId = String((event as any)?.sourceMovieId || '').trim();
          if (movieId && sourceMovieId === movieId) return true;

          const eventTitle = String(event?.title || '').trim().toLowerCase();
          return normalizedTitle ? eventTitle.includes(normalizedTitle) : false;
        });
      },
      error: (error) => {
        if (requestToken !== this.matchedEventsToken) return;
        this.matchedEvents = [];
        this.matchedEventsError =
          error?.error?.message || 'Matching events could not be loaded.';
      },
      complete: () => {
        if (requestToken !== this.matchedEventsToken) return;
        this.matchedEventsLoading = false;
      },
    });
  }
}





