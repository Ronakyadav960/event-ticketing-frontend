import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';

@Component({
  standalone: true,
  selector: 'app-events',
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
})
export class EventsComponent implements OnInit {
  private es = inject(EventService);
  private router = inject(Router);

  loading = false;
  error = '';
  events: any[] = [];

  // UI state
  q = '';
  status: 'all' | 'upcoming' | 'past' | 'soldout' = 'all';
  sort: 'dateAsc' | 'dateDesc' | 'priceAsc' | 'priceDesc' = 'dateAsc';

  // base url for images served from backend
  BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://event-ticketing-backend-1.onrender.com';


  ngOnInit(): void {
    this.fetchEvents();
  }

  fetchEvents(): void {
    this.loading = true;
    this.error = '';
    this.es.getAllEvents().subscribe({
      next: (list: any[]) => {
        this.events = Array.isArray(list) ? list : [];
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Failed to load events.';
      },
      complete: () => (this.loading = false),
    });
  }

 imgUrl(e: any): string {
  const id = e?._id || e?.id;
  return id ? `${this.BASE}/api/events/${id}/image` : '';
}


  remainingSeats(e: any): number {
    const total = Number(e?.totalSeats ?? 0);
    const booked = Number(e?.bookedSeats ?? 0);
    const left = total - booked;
    return isNaN(left) ? 0 : Math.max(0, left);
  }

  statusOf(e: any): 'Upcoming' | 'Past' | 'Sold Out' {
    const left = this.remainingSeats(e);
    if (left <= 0) return 'Sold Out';
    const d = new Date(e?.date);
    if (!isNaN(d.getTime()) && d.getTime() < Date.now()) return 'Past';
    return 'Upcoming';
  }

  get filtered(): any[] {
    const text = this.q.trim().toLowerCase();

    let list = this.events.filter((e) => {
      const title = (e?.title || '').toLowerCase();
      const venue = (e?.venue || '').toLowerCase();
      const matchesText = !text || title.includes(text) || venue.includes(text);

      const st = this.statusOf(e);
      const matchesStatus =
        this.status === 'all' ||
        (this.status === 'upcoming' && st === 'Upcoming') ||
        (this.status === 'past' && st === 'Past') ||
        (this.status === 'soldout' && st === 'Sold Out');

      return matchesText && matchesStatus;
    });

    list = list.sort((a, b) => {
      const da = new Date(a?.date || 0).getTime();
      const db = new Date(b?.date || 0).getTime();
      const pa = Number(a?.price ?? 0);
      const pb = Number(b?.price ?? 0);

      switch (this.sort) {
        case 'dateAsc': return da - db;
        case 'dateDesc': return db - da;
        case 'priceAsc': return pa - pb;
        case 'priceDesc': return pb - pa;
        default: return 0;
      }
    });

    return list;
  }

  openEvent(e: any): void {
    const id = e?._id || e?.id;
    if (!id) return;
    this.router.navigate(['/events', id]);
  }
}
