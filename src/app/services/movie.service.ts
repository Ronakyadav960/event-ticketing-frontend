import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  MovieDetailResponse,
  MovieListResponse,
  MovieRecommendationItem,
  MovieRecommendationResponse,
  MovieSearchResponse,
} from '../models/movie.model';

@Injectable({
  providedIn: 'root',
})
export class MovieService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/movies`;
  private searchCache = new Map<string, Observable<MovieSearchResponse>>();
  private recommendationCache = new Map<string, Observable<MovieRecommendationResponse>>();
  private movieListCache = new Map<string, Observable<MovieListResponse>>();
  private movieByIdCache = new Map<string, Observable<MovieDetailResponse>>();

  getMovies(query = '', page = 1, limit = 12): Observable<MovieListResponse> {
    const key = JSON.stringify(['list', query.trim().toLowerCase(), page, limit]);
    const cached = this.movieListCache.get(key);
    if (cached) return cached;

    let params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('limit', String(Math.max(1, limit)));

    if (query.trim()) {
      params = params.set('q', query.trim());
    }

    const request$ = this.http.get<MovieListResponse>(this.api, { params }).pipe(
      switchMap((response) =>
        this.enrichMovies(Array.isArray(response.data) ? response.data : []).pipe(
          map((data) => ({ ...response, data }))
        )
      ),
      shareReplay(1)
    );

    this.movieListCache.set(key, request$);
    return request$;
  }

  searchMovies(query: string, limit = 8): Observable<MovieSearchResponse> {
    const normalizedQuery = query.trim().toLowerCase();
    const key = JSON.stringify(['search', normalizedQuery, limit]);
    const cached = this.searchCache.get(key);
    if (cached) return cached;

    const params = new HttpParams()
      .set('q', query.trim())
      .set('limit', String(limit));

    const request$ = this.http.get<MovieSearchResponse>(`${this.api}/search`, { params }).pipe(
      switchMap((response) =>
        this.enrichMovies(Array.isArray(response.results) ? response.results : []).pipe(
          map((results) => ({ ...response, results }))
        )
      ),
      shareReplay(1)
    );

    this.searchCache.set(key, request$);
    return request$;
  }

  getRecommendations(title: string, limit = 6): Observable<MovieRecommendationResponse> {
    const normalizedTitle = title.trim().toLowerCase();
    const key = JSON.stringify(['recommend', normalizedTitle, limit]);
    const cached = this.recommendationCache.get(key);
    if (cached) return cached;

    const params = new HttpParams()
      .set('title', title.trim())
      .set('limit', String(limit));

    const request$ = this.http.get<MovieRecommendationResponse>(`${this.api}/recommendations`, { params }).pipe(
      switchMap((response) => {
        const selected$ = response.selected
          ? this.enrichMovie(response.selected)
          : of(null);
        const recommendations$ = this.enrichMovies(
          Array.isArray(response.recommendations) ? response.recommendations : []
        );

        return forkJoin([selected$, recommendations$]).pipe(
          map(([selected, recommendations]) => ({
            ...response,
            selected: selected || undefined,
            recommendations,
          }))
        );
      }),
      shareReplay(1)
    );

    this.recommendationCache.set(key, request$);
    return request$;
  }

  getMovieById(movieId: string): Observable<MovieDetailResponse> {
    const normalizedId = movieId.trim();
    const cached = this.movieByIdCache.get(normalizedId);
    if (cached) return cached;

    const request$ = this.http
      .get<MovieDetailResponse>(`${this.api}/${encodeURIComponent(movieId.trim())}`)
      .pipe(
        switchMap((response) =>
          this.enrichMovie(response.movie).pipe(map((movie) => ({ ...response, movie })))
        ),
        shareReplay(1)
      );

    this.movieByIdCache.set(normalizedId, request$);
    return request$;
  }

  private enrichMovies(movies: MovieRecommendationItem[]): Observable<MovieRecommendationItem[]> {
    if (!movies.length) return of([]);
    return forkJoin(movies.map((movie) => this.enrichMovie(movie)));
  }

  private enrichMovie(movie: MovieRecommendationItem): Observable<MovieRecommendationItem> {
    if (!movie) return of({} as MovieRecommendationItem);
    return of(movie);
  }
}
