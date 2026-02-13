import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';

export interface User {
  id?: string;         // backend sends id
  _id?: string;        // sometimes mongo sends _id
  name: string;
  email: string;
  role: 'user' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ Always use env base URL (prod = Render, dev = localhost)
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // 🔐 LOGIN
  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.apiUrl}/login`, {
      email: (email || '').trim().toLowerCase(),
      password: (password || '').trim(),
    });
  }

  // 📝 REGISTER
  register(name: string, email: string, password: string) {
    return this.http.post<{ message: string; user: User }>(`${this.apiUrl}/register`, {
      name: (name || '').trim(),
      email: (email || '').trim().toLowerCase(),
      password: (password || '').trim(),
    });
  }

  // 💾 SAVE LOGIN DATA
  saveAuthData(token: string, user: User): void {
    const normalizedUser: User = {
      ...user,
      id: user.id || user._id
    };

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(normalizedUser));
  }

  // 🔑 GET TOKEN
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // 👤 GET USER
  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? (JSON.parse(user) as User) : null;
  }

  // 🛡️ CHECK IF ADMIN
  isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  }

  // ✅ CHECK LOGIN
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // 🚪 LOGOUT
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }
}
