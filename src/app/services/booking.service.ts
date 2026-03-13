// src/app/services/booking.service.ts ✅ UPDATED (uses environment.apiUrl)
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  // ✅ base urls (NO localhost hardcode)
  private API = `${environment.apiUrl}/api/bookings`;
  private PAYMENTS_API = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {}

  // 🔐 JWT headers helper
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  // ==========================
  // CREATE BOOKING (USER)
  // ==========================
  createBooking(data: any): Observable<any> {
    return this.http.post(this.API, data, this.getAuthHeaders());
  }

  // alias (for old code compatibility)
  addBooking(data: any): Observable<any> {
    return this.createBooking(data);
  }

  // ==========================
  // ✅ STRIPE: CREATE CHECKOUT SESSION
  // ==========================
  createCheckoutSession(data: any): Observable<any> {
    return this.http.post(
      `${this.PAYMENTS_API}/create-checkout-session`,
      data,
      this.getAuthHeaders()
    );
  }

  // ==========================
  // GET BOOKING BY TICKET ID
  // ==========================
  getByTicketId(ticketId: string): Observable<any> {
    return this.http.get(`${this.API}/ticket/${ticketId}`, this.getAuthHeaders());
  }

  // ==========================
  // GET MY BOOKINGS (USER)
  // ==========================
  getMyBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/my`, this.getAuthHeaders());
  }

  // ==========================
  // ADMIN: GET ALL BOOKINGS
  // ==========================
  getAllBookings(params?: { page?: number; limit?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<any>(this.API, { ...this.getAuthHeaders(), params: httpParams });
  }

  // ==========================
  // ADMIN: DELETE BOOKING
  // ==========================
  deleteBooking(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`, this.getAuthHeaders());
  }
}






