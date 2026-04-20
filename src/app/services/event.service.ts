// services/event.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private API = `${environment.apiUrl}/api/events`;
  private omdbApiKey = String((environment as any).omdbApiKey || '').trim();
  private omdbApiUrl = String((environment as any).omdbApiUrl || 'https://www.omdbapi.com').replace(/\/+$/, '');
  private readonly posterLookupTimeoutMs = 2500;
  private moviePosterCache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  private getAuthHeadersJson() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    };
  }

  private getAuthHeadersFormData() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    };
  }

  private unwrap(res: any): any {
    return res?.event ?? res?.data ?? res;
  }

  private normalizeImageUrl(url: any): string {
    if (!url || typeof url !== 'string') return '';

    const base = environment.apiUrl.replace(/\/+$/, '');

    url = url
      .replace(/^http:\/\/localhost:5000/i, base)
      .replace(/^https?:\/\/localhost:5000/i, base);

    if (url.startsWith('/')) return `${base}${url}`;
    if (/^https?:\/\//i.test(url)) return url;

    return url;
  }

  private normalizeEvent(e: any): Event {
    const ev = this.unwrap(e);
    const id = ev?.id || ev?._id;

    return {
      ...ev,
      id,
      bookedSeats: ev?.bookedSeats ?? 0,
      imageUrl: this.normalizeImageUrl(ev?.imageUrl),
    } as Event;
  }

  private enrichEventPoster(event: Event | null): Observable<Event | null> {
    if (!event) return of(event);

    const existingImage = this.normalizeImageUrl((event as any)?.imageUrl);
    if (existingImage) {
      return of({ ...(event as any), imageUrl: existingImage } as Event);
    }

    const movieMeta = (event as any)?.movieMeta || {};
    const cachedUrl = this.normalizeImageUrl(movieMeta?.posterUrl);
    if (cachedUrl) {
      return of({
        ...(event as any),
        imageUrl: cachedUrl,
        movieMeta: { ...movieMeta, posterUrl: cachedUrl },
      } as Event);
    }

    const lookupTitle = this.resolvePosterLookupTitle(event, movieMeta);
    const lookupYear = this.resolvePosterLookupYear(event, movieMeta);
    const imdbId = String(movieMeta?.imdbId || '').trim();
    const cacheKey = this.buildPosterCacheKey(lookupTitle, lookupYear, imdbId);

    if (!cacheKey || !this.omdbApiKey) {
      return of(event);
    }

    const fromCache = this.moviePosterCache.get(cacheKey);
    if (fromCache) {
      return of({
        ...(event as any),
        imageUrl: fromCache,
        movieMeta: { ...movieMeta, posterUrl: fromCache },
      } as Event);
    }

    let params = new HttpParams().set('apikey', this.omdbApiKey);
    if (imdbId) {
      params = params.set('i', imdbId);
    } else {
      params = params.set('t', lookupTitle);
      if (lookupYear) params = params.set('y', lookupYear);
    }

    return this.http.get<any>(this.omdbApiUrl, { params }).pipe(
      timeout(this.posterLookupTimeoutMs),
      map((response) => {
        const posterUrl = this.normalizeOmdbPosterUrl(response?.Poster);
        if (posterUrl) this.moviePosterCache.set(cacheKey, posterUrl);

        return {
          ...(event as any),
          imageUrl: posterUrl || existingImage,
          movieMeta: {
            ...movieMeta,
            posterPath: posterUrl || movieMeta?.posterPath || '',
            posterUrl: posterUrl || movieMeta?.posterUrl || '',
            imdbId: imdbId || String(response?.imdbID || ''),
            releaseDate: movieMeta?.releaseDate || String(response?.Released || ''),
            voteAverage: movieMeta?.voteAverage || Number(response?.imdbRating || 0),
            popularity:
              movieMeta?.popularity ||
              Number(String(response?.imdbVotes || '').replace(/,/g, '') || 0),
          },
        } as Event;
      }),
      catchError(() => of(event))
    );
  }

  private resolvePosterLookupTitle(event: Event, movieMeta: any): string {
    return String(
      movieMeta?.title ||
      movieMeta?.movieTitle ||
      (event as any)?.movieTitle ||
      event?.title ||
      ''
    ).trim();
  }

  private resolvePosterLookupYear(event: Event, movieMeta: any): string {
    const releaseDate = String(movieMeta?.releaseDate || '').trim();
    const eventDate = String((event as any)?.date || '').trim();
    const raw = releaseDate || eventDate;
    const match = raw.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
  }

  private buildPosterCacheKey(title: string, year: string, imdbId: string): string {
    if (imdbId) return `imdb:${imdbId.toLowerCase()}`;
    if (!title) return '';
    return `title:${title.toLowerCase()}|${year || 'na'}`;
  }

  private normalizeOmdbPosterUrl(value: any): string {
    const poster = String(value || '').trim();
    if (!poster || /^n\/a$/i.test(poster)) return '';
    return this.normalizeImageUrl(poster);
  }

  private enrichEventPosters(events: Event[]): Observable<Event[]> {
    if (!events.length) return of([]);
    return forkJoin(events.map((event) => this.enrichEventPoster(event))).pipe(
      map((items) => items.filter((item): item is Event => !!item))
    );
  }

  getAllEvents(
    category?: string,
    page?: number,
    limit?: number,
    query?: string,
    sourceMovieId?: string
  ): Observable<{
    data: Event[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (page) params = params.set('page', String(page));
    if (limit) params = params.set('limit', String(limit));
    if (query?.trim()) params = params.set('q', query.trim());
    if (sourceMovieId?.trim()) params = params.set('sourceMovieId', sourceMovieId.trim());

    return this.http.get<any>(this.API, { params }).pipe(
      map((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.events)
            ? res.events
            : Array.isArray(res?.data)
              ? res.data
              : [];

        const data = list.map((e: any) => this.normalizeEvent(e));

        if (Array.isArray(res)) {
          return {
            data,
            page: 1,
            limit: data.length,
            total: data.length,
            totalPages: 1,
          };
        }

        return {
          data,
          page: Number(res?.page) || 1,
          limit: Number(res?.limit) || data.length,
          total: Number(res?.total) || data.length,
          totalPages: Number(res?.totalPages) || 1,
        };
      }),
      switchMap((response) => this.enrichEventPosters(response.data).pipe(map((data) => ({ ...response, data }))))
    );
  }

  getMovieEvent(sourceMovieId: string): Observable<Event | null> {
    const normalizedId = String(sourceMovieId || '').trim();
    if (!normalizedId) return of(null);

    return this.http.get<any>(`${this.API}/movie-source/${encodeURIComponent(normalizedId)}`).pipe(
      map((res) => this.normalizeEvent(res)),
      switchMap((event) => this.enrichEventPoster(event)),
      catchError(() => of(null))
    );
  }

  getEventById(id: string): Observable<Event> {
    return this.http
      .get<any>(`${this.API}/${id}`)
      .pipe(
        map((res) => this.normalizeEvent(res)),
        switchMap((event) => this.enrichEventPoster(event) as Observable<Event>)
      );
  }

  createEvent(event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http
      .post<any>(this.API, event as any, options)
      .pipe(map((res) => this.normalizeEvent(res)));
  }

  updateEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http
      .put<any>(`${this.API}/${id}`, event as any, options)
      .pipe(map((res) => this.normalizeEvent(res)));
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, this.getAuthHeadersJson());
  }

  bookSeats(id: string, seats: number): Observable<any> {
    return this.http.post(`${this.API}/${id}/book`, { seats }, this.getAuthHeadersJson());
  }

  getCategories(): Observable<string[]> {
    return this.http.get<any>(`${this.API}/categories`).pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : res?.categories;
        return Array.isArray(list) ? list : [];
      })
    );
  }

  getEventImageUrl(e: any): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const id = e?.id || e?._id;

    if (e?.imageUrl) return this.normalizeImageUrl(e.imageUrl);

    if (e?.imageFileId) {
      return id ? `${base}/api/events/${id}/image` : '';
    }

    return '';
  }
}
