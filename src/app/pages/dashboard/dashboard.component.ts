import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { EventService } from '../../services/event.service';
import { AuthService } from '../../auth/auth.service';
import { Event } from '../../models/event.model';
import { environment } from '../../../environments/environment.prod';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styleUrls: ['./dashboard.component.css'],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  events: Event[] = [];

  totalSeats = 0;
  bookedSeats = 0;
  availableSeats = 0;

  constructor(
    private eventService: EventService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (events: Event[]) => {
        // normalize id for safety
        this.events = (events || []).map((e: any) => ({
          ...(e as any),
          id: (e as any)?.id || (e as any)?._id
        })) as Event[];

        this.totalSeats = this.events.reduce((sum: number, e: any) => sum + (e.totalSeats ?? 0), 0);
        this.bookedSeats = this.events.reduce((sum: number, e: any) => sum + (e.bookedSeats ?? 0), 0);
        this.availableSeats = this.totalSeats - this.bookedSeats;
      },
      error: (err) => console.error('Dashboard events load failed', err)
    });
  }

  remainingSeats(e: any): number {
    return (e.totalSeats ?? 0) - (e.bookedSeats ?? 0);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  deleteEvent(id?: string): void {
    const safeId = id ?? '';
    if (!safeId) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    this.eventService.deleteEvent(safeId).subscribe({
      next: () => this.loadEvents(),
      error: (err) => {
        console.error(err);
        alert('Failed to delete event');
      }
    });
  }

  editEvent(id?: string): void {
    const safeId = id ?? '';
    if (!safeId) return;
    this.router.navigate(['/admin/edit-event', safeId]);
  }

  logout(): void {
    this.authService.logout();
  }
}
