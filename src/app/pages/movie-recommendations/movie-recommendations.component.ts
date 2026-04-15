import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MovieService } from '../../services/movie.service';
import { MovieRecommendationItem } from '../../models/movie.model';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-movie-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './movie-recommendations.component.html',
  styleUrls: ['./movie-recommendations.component.css'],
})
export class MovieRecommendationsComponent implements OnInit, OnDestroy {
  private movieService = inject(MovieService);
  private eventService = inject(EventService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private categoryLoadToken = 0;
  private recommendationLoadToken = 0;
  readonly movieCategories = ['All', 'Sci-Fi', 'Thriller', 'Romantic', 'Action', 'Comedy'];

  query = '';
  loading = false;
  searchError = '';
  closestMatchNote = '';
  helperText = 'The selected movie will appear first, then the recommendations below.';
  selectedCategory = 'All';
  selectedMovieTitle = '';
  selectedMovie: MovieRecommendationItem | null = null;
  recommendations: MovieRecommendationItem[] = [];
  quickMatches: MovieRecommendationItem[] = [];
  categoryMovies: MovieRecommendationItem[] = [];
  emptyState = '';

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.runAutoSearch(value);
      });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const title = String(params.get('title') || '').trim();
      const category = String(params.get('category') || '').trim();
      if (category && this.movieCategories.includes(category)) {
        this.selectedCategory = category;
      }
      if (!title) {
        this.loadCategoryMovies();
        return;
      }
      if (title === this.query.trim()) return;
      this.query = title;
      this.fetchRecommendations(title);
    });

    this.route.url.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.query.trim()) {
        this.loadCategoryMovies();
      }
    });

    this.loadCategoryMovies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.searchInput$.next(value);
  }

  submitSearch(): void {
    const title = this.query.trim();
    if (!title) {
      this.resetState('Enter a movie title to get recommendations.');
      this.loadCategoryMovies();
      return;
    }

    this.fetchRecommendations(title);
  }

  useSuggestion(movie: MovieRecommendationItem): void {
    this.query = movie.title;
    this.submitSearch();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.query = '';
    this.resetState('');
    this.loadCategoryMovies();
  }

  openMovie(movie: MovieRecommendationItem): void {
    const movieId = String(movie?.movieId || '').trim();
    if (!movieId) return;

    this.eventService.getMovieEvent(movieId).subscribe({
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

  private fetchRecommendations(title: string): void {
    const requestToken = ++this.recommendationLoadToken;
    this.loading = true;
    this.searchError = '';
    this.closestMatchNote = '';
    this.emptyState = '';
    this.categoryMovies = [];

    this.movieService.searchMovies(title, 8).subscribe({
      next: (searchResponse) => {
        if (requestToken !== this.recommendationLoadToken) return;
        const matches = Array.isArray(searchResponse.results) ? searchResponse.results : [];
        this.quickMatches = matches;

        const selected =
          searchResponse.closestMatch ||
          matches.find((movie) => movie.title.trim().toLowerCase() === title.trim().toLowerCase()) ||
          matches[0] ||
          null;

        if (!selected) {
          this.loading = false;
          this.selectedMovieTitle = '';
          this.selectedMovie = null;
          this.recommendations = [];
          this.searchError = 'No movie found for this search.';
          this.emptyState = 'Try a different title or pick one of the closest matches.';
          return;
        }

        this.movieService.getRecommendations(selected.title).subscribe({
          next: (response) => {
            if (requestToken !== this.recommendationLoadToken) return;
            this.loading = false;
            this.selectedMovieTitle = response.matchedTitle || selected.title;
            this.selectedMovie = response.selected || response.closestMatch || selected;
            this.recommendations = Array.isArray(response.recommendations)
              ? response.recommendations
              : [];
            this.quickMatches = Array.isArray(response.suggestions) && response.suggestions.length
              ? response.suggestions
              : matches;
            this.emptyState = this.recommendations.length
              ? ''
              : 'No similar movies were found for this title yet.';
            this.helperText = response.exactMatch
              ? 'The selected movie will appear first, then the recommendations below.'
              : `Closest match used: ${(response.closestMatch || response.selected || selected).title}`;
            this.closestMatchNote =
              !response.exactMatch && (response.closestMatch || selected)
                ? `Closest match used: ${(response.closestMatch || selected).title}`
                : '';
          },
          error: () => {
            if (requestToken !== this.recommendationLoadToken) return;
            this.loading = false;
            this.selectedMovieTitle = selected.title;
            this.selectedMovie = selected;
            this.recommendations = [];
            this.searchError = '';
            this.emptyState = 'Recommendations are unavailable right now.';
            this.helperText = `Closest match used: ${selected.title}`;
            this.closestMatchNote = `Closest match used: ${selected.title}`;
          },
        });
      },
      error: (error) => {
        if (requestToken !== this.recommendationLoadToken) return;
        this.loading = false;
        this.selectedMovieTitle = '';
        this.selectedMovie = null;
        this.recommendations = [];
        this.quickMatches = [];
        this.searchError =
          error?.error?.message || 'We could not load recommendations for that movie.';
        this.emptyState = '';
      },
    });
  }

  private runAutoSearch(value: string): void {
    const title = value.trim();
    if (!title) {
      this.resetState('');
      this.loadCategoryMovies();
      return;
    }

    if (title.length < 2) {
      this.resetState('Type at least 2 characters to search.');
      return;
    }

    this.fetchRecommendations(title);
  }

  private resetState(message: string): void {
    this.recommendationLoadToken += 1;
    this.loading = false;
    this.searchError = message;
    this.closestMatchNote = '';
    this.emptyState = '';
    this.helperText = 'The selected movie will appear first, then the recommendations below.';
    this.selectedMovieTitle = '';
    this.selectedMovie = null;
    this.recommendations = [];
    this.quickMatches = [];
  }

  private loadCategoryMovies(): void {
    const requestToken = ++this.categoryLoadToken;
    this.loading = true;
    this.searchError = '';
    this.emptyState = '';
    this.selectedMovie = null;
    this.selectedMovieTitle = '';
    this.recommendations = [];
    this.quickMatches = [];
    this.movieService.getMovies('', 1, 60).subscribe({
      next: (response) => {
        if (requestToken !== this.categoryLoadToken) return;
        const allMovies = Array.isArray(response.data) ? response.data : [];
        this.categoryMovies =
          this.selectedCategory === 'All'
            ? allMovies
            : allMovies.filter((movie) => movie.discoveryCategory === this.selectedCategory);
        this.emptyState = this.categoryMovies.length
          ? ''
          : `No ${this.selectedCategory} movies found right now.`;
      },
      error: (error) => {
        if (requestToken !== this.categoryLoadToken) return;
        this.categoryMovies = [];
        this.searchError = error?.error?.message || 'Movie catalog could not be loaded.';
      },
      complete: () => {
        if (requestToken !== this.categoryLoadToken) return;
        this.loading = false;
      },
    });
  }

  trackMovie(_: number, movie: MovieRecommendationItem): string {
    return movie.movieId || movie.title;
  }

  posterStyle(movie: MovieRecommendationItem): Record<string, string> {
    return movie.posterUrl ? { 'background-image': `url('${movie.posterUrl}')` } : {};
  }
}
