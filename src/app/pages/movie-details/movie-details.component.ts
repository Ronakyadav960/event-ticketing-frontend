import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MovieRecommendationItem } from '../../models/movie.model';
import { EventService } from '../../services/event.service';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './movie-details.component.html',
  styleUrls: ['./movie-details.component.css'],
})
export class MovieDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private movieService = inject(MovieService);
  private eventService = inject(EventService);

  loading = true;
  error = '';
  movie: MovieRecommendationItem | null = null;
  relatedEvents: any[] = [];
  eventsLoading = false;
  eventsError = '';
  recommendations: MovieRecommendationItem[] = [];

  ngOnInit(): void {
    const movieId = String(this.route.snapshot.paramMap.get('movieId') || '').trim();
    if (!movieId) {
      this.loading = false;
      this.error = 'Movie id is required.';
      return;
    }

    this.eventService.getMovieEvent(movieId).subscribe({
      next: (event) => {
        const eventId = event?._id || event?.id;
        if (eventId) {
          this.router.navigate(['/events', eventId]);
          return;
        }
        this.loadMovieDetails(movieId);
      },
      error: () => {
        this.loadMovieDetails(movieId);
      },
    });
  }

  private loadMovieDetails(movieId: string): void {
    this.movieService.getMovieById(movieId).subscribe({
      next: (response) => {
        this.movie = response.movie;
        this.loading = false;
        this.loadRecommendations(response.movie.title);
        this.loadRelatedEvents(movieId, response.movie.title);
      },
      error: (error) => {
        this.loading = false;
        this.error = error?.error?.message || 'Movie details could not be loaded.';
      },
    });
  }

  openEvent(event: any): void {
    const id = event?._id || event?.id;
    if (!id) return;
    this.router.navigate(['/events', id]);
  }

  posterStyle(movie: MovieRecommendationItem | null): Record<string, string> {
    return movie?.posterUrl ? { 'background-image': `url('${movie.posterUrl}')` } : {};
  }

  trackMovie(_: number, movie: MovieRecommendationItem): string {
    return movie.movieId || movie.title;
  }

  private loadRecommendations(title: string): void {
    if (!title.trim()) return;

    this.movieService.getRecommendations(title, 6).subscribe({
      next: (response) => {
        this.recommendations = Array.isArray(response.recommendations) ? response.recommendations : [];
      },
      error: () => {
        this.recommendations = [];
      },
    });
  }

  private loadRelatedEvents(movieId: string, title: string): void {
    if (!movieId.trim() && !title.trim()) return;
    this.eventsLoading = true;
    this.eventsError = '';

    this.eventService.getAllEvents(undefined, 1, 12, movieId.trim() ? undefined : title).subscribe({
      next: (response) => {
        this.eventsLoading = false;
        const list = Array.isArray(response.data) ? response.data : [];
        this.relatedEvents = movieId.trim()
          ? list.filter((event) => String((event as any)?.sourceMovieId || '').trim() === movieId.trim())
          : list;
      },
      error: (error) => {
        this.eventsLoading = false;
        this.relatedEvents = [];
        this.eventsError = error?.error?.message || 'Matching movie events could not be loaded.';
      },
    });
  }
}
