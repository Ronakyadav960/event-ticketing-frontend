import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private API = `${environment.apiUrl}/api/dashboard`;

  constructor(private http: HttpClient) {}

  // 🔐 Common Auth Header
  private getAuthHeaders() {
    const token = localStorage.getItem('token');

    return {
      headers: new HttpHeaders({
        Authorization: token ? `Bearer ${token}` : ''
      })
    };
  }

  // 👑 Superadmin Dashboard
  getSuperadminDashboard() {
    return this.http.get(
      `${this.API}/superadmin`,
      this.getAuthHeaders()
    );
  }

  // 👤 Creator Dashboard
  getCreatorDashboard() {
    return this.http.get(
      `${this.API}/creator`,
      this.getAuthHeaders()
    );
  }
} 