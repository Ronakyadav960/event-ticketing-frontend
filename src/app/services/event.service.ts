// services/event.service.ts ✅ UPDATED (uses environment.apiUrl + normalizes imageUrl)
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  // ✅ Base URLs (NO localhost hardcode)
  private API = `${environment.apiUrl}/api/events`;
  private ADMIN_API = `${environment.apiUrl}/api/admin/events`;

  constructor(private http: HttpClient) {}

  // ✅ JWT Header (JSON)
  private getAuthHeadersJson() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    };
  }

  // ✅ JWT Header (FormData) -> DO NOT set Content-Type
  private getAuthHeadersFormData() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    };
  }

  private unwrapEvent(res: any): any {
    return res?.event ?? res?.data ?? res;
  }

  // ✅ Normalize imageUrl so it never points to localhost in prod
  private normalizeImageUrl(url: any): string {
    if (!url || typeof url !== 'string') return '';

    const base = environment.apiUrl.replace(/\/+$/, '');

    // Replace saved localhost urls
    url = url.replace(/^http:\/\/localhost:5000/i, base).replace(/^https?:\/\/localhost:5000/i, base);

    // If relative uploads path, make absolute
    if (url.startsWith('/uploads/')) return `${base}${url}`;

    // If already absolute (http/https) return as-is
    if (/^https?:\/\//i.test(url)) return url;

    // If any other relative path
    if (url.startsWith('/')) return `${base}${url}`;

    return url;
  }

  private normalizeEvent(e: any): Event {
    const ev = this.unwrapEvent(e);
    const id = ev?.id || ev?._id;

    return {
      ...ev,
      id,
      bookedSeats: ev?.bookedSeats ?? 0,
      imageUrl: this.normalizeImageUrl(ev?.imageUrl),
    } as Event;
  }

  // ✅ Helper: always build image endpoint (GridFS route)
  // If imageUrl exists, use it. Else build /api/events/:id/image
  getEventImageUrl(e: any): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const id = e?.id || e?._id;
    const direct = e?.imageUrl;

    if (direct) return this.normalizeImageUrl(direct);
    return id ? `${base}/api/events/${id}/image` : '';
  }

  // =====================
  // PUBLIC ROUTES
  // =====================
  getAllEvents(): Observable<Event[]> {
    return this.http.get<any>(this.API).pipe(
      map((res) => {
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
    return this.http.get<any>(`${this.API}/${id}`).pipe(map((res: any) => this.normalizeEvent(res)));
  }

  // =====================
  // CREATE/UPDATE/DELETE (your backend uses /api/events with auth)
  // =====================
  addEvent(event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.post<any>(this.API, event as any, options).pipe(map((res: any) => this.normalizeEvent(res)));
  }

  // alias
  createEvent(event: Event | FormData): Observable<Event> {
    return this.addEvent(event);
  }

  updateEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.put<any>(`${this.API}/${id}`, event as any, options).pipe(map((res: any) => this.normalizeEvent(res)));
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, this.getAuthHeadersJson());
  }

  // =====================
  // ADMIN endpoints (if you use admin.routes.js)
  // =====================
  getAdminEventById(id: string): Observable<Event> {
    return this.http.get<any>(`${this.ADMIN_API}/${id}`, this.getAuthHeadersJson()).pipe(map((res: any) => this.normalizeEvent(res)));
  }

  updateAdminEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.put<any>(`${this.ADMIN_API}/${id}`, event as any, options).pipe(map((res: any) => this.normalizeEvent(res)));
  }

  deleteAdminEvent(id: string): Observable<any> {
    return this.http.delete(`${this.ADMIN_API}/${id}`, this.getAuthHeadersJson());
  }

  // =====================
  // BOOKING ROUTE
  // =====================
  bookSeats(id: string, seats: number): Observable<any> {
    return this.http.post(`${this.API}/${id}/book`, { seats }, this.getAuthHeadersJson());
  }
}
