// services/event.service.ts ✅ UPDATED (uses environment.apiUrl)
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
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
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  // ✅ JWT Header (FormData) -> DO NOT set Content-Type
  private getAuthHeadersFormData() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  private unwrapEvent(res: any): any {
    return res?.event ?? res?.data ?? res;
  }

  private normalizeEvent(e: any): Event {
    const ev = this.unwrapEvent(e);
    return {
      ...ev,
      id: ev?.id || ev?._id,
      bookedSeats: ev?.bookedSeats ?? 0
    } as Event;
  }

  // =====================
  // PUBLIC ROUTES
  // =====================
  getAllEvents(): Observable<Event[]> {
    return this.http.get<any>(this.API).pipe(
      map((res) => {
        const list =
          Array.isArray(res) ? res :
          Array.isArray(res?.events) ? res.events :
          Array.isArray(res?.data) ? res.data :
          [];
        return list.map((e: any) => this.normalizeEvent(e));
      })
    );
  }

  getEventById(id: string): Observable<Event> {
    return this.http.get<any>(`${this.API}/${id}`).pipe(
      map((res: any) => this.normalizeEvent(res))
    );
  }

  // =====================
  // CREATE/UPDATE/DELETE (your backend uses /api/events with auth)
  // =====================
  addEvent(event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.post<any>(this.API, event as any, options).pipe(
      map((res: any) => this.normalizeEvent(res))
    );
  }

  // alias
  createEvent(event: Event | FormData): Observable<Event> {
    return this.addEvent(event);
  }

  updateEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.put<any>(`${this.API}/${id}`, event as any, options).pipe(
      map((res: any) => this.normalizeEvent(res))
    );
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, this.getAuthHeadersJson());
  }

  // =====================
  // ADMIN endpoints (if you use admin.routes.js)
  // =====================
  getAdminEventById(id: string): Observable<Event> {
    return this.http.get<any>(`${this.ADMIN_API}/${id}`, this.getAuthHeadersJson()).pipe(
      map((res: any) => this.normalizeEvent(res))
    );
  }

  updateAdminEvent(id: string, event: Event | FormData): Observable<Event> {
    const isFormData = event instanceof FormData;
    const options = isFormData ? this.getAuthHeadersFormData() : this.getAuthHeadersJson();

    return this.http.put<any>(`${this.ADMIN_API}/${id}`, event as any, options).pipe(
      map((res: any) => this.normalizeEvent(res))
    );
  }

  deleteAdminEvent(id: string): Observable<any> {
    return this.http.delete(`${this.ADMIN_API}/${id}`, this.getAuthHeadersJson());
  }

  // =====================
  // BOOKING ROUTE
  // =====================
  bookSeats(id: string, seats: number): Observable<any> {
    return this.http.post(
      `${this.API}/${id}/book`,
      { seats },
      this.getAuthHeadersJson()
    );
  }
}
