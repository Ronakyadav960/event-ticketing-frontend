// services/event.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EventService {

  // ✅ Single API (role handled in backend middleware)
  private API = `${environment.apiUrl}/api/events`;

  constructor(private http: HttpClient) {}

  // =========================
  // AUTH HEADERS
  // =========================
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

  // =========================
  // NORMALIZATION
  // =========================
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

  // =========================
  // PUBLIC ROUTES
  // =========================
  getAllEvents(): Observable<Event[]> {
    return this.http.get<any>(this.API).pipe(
      map(res => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.events)
          ? res.events
          : Array.isArray(res?.data)
          ? res.data
          : [];

        return list.map((e: any) => this.normalizeEvent(e));
      })
    );
  }

  getEventById(id: string): Observable<Event> {
    return this.http
      .get<any>(`${this.API}/${id}`)
      .pipe(map(res => this.normalizeEvent(res)));
  }

  // =========================
  // CREATE
  // =========================
  createEvent(event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData
      ? this.getAuthHeadersFormData()
      : this.getAuthHeadersJson();

    return this.http
      .post<any>(this.API, event as any, options)
      .pipe(map(res => this.normalizeEvent(res)));
  }

  // =========================
  // UPDATE
  // =========================
  updateEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData
      ? this.getAuthHeadersFormData()
      : this.getAuthHeadersJson();

    return this.http
      .put<any>(`${this.API}/${id}`, event as any, options)
      .pipe(map(res => this.normalizeEvent(res)));
  }

  // =========================
  // DELETE
  // =========================
  deleteEvent(id: string): Observable<any> {
    return this.http.delete(
      `${this.API}/${id}`,
      this.getAuthHeadersJson()
    );
  }

  // =========================
  // BOOK SEATS
  // =========================
  bookSeats(id: string, seats: number): Observable<any> {
    return this.http.post(
      `${this.API}/${id}/book`,
      { seats },
      this.getAuthHeadersJson()
    );
  }

  // =========================
  // HELPER: IMAGE URL
  // =========================
  getEventImageUrl(e: any): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const id = e?.id || e?._id;

    if (e?.imageUrl) return this.normalizeImageUrl(e.imageUrl);

    return id ? `${base}/api/events/${id}/image` : '';
  }
}
