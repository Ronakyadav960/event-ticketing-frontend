import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-create-event',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css'],
})
export class CreateEventComponent implements OnInit {

  private es = inject(EventService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  isEdit = false;
  eventId: string | null = null;

  title = '';
  description = '';
  date = '';
  venue = '';
  price = 0;
  totalSeats = 1;

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;

  loading = false;
  successMessage = '';
  errorMessage = '';

  // =============================
  // INIT
  // =============================
  ngOnInit(): void {

    if (!this.auth.isCreator() && !this.auth.isSuperAdmin()) {
      this.router.navigate(['/events']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.eventId = id;
      this.loadEvent(id);
    }
  }

  // =============================
  // IMAGE URL FIX (for prod/local)
  // =============================
  getImageUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const clean = path.startsWith('/') ? path.substring(1) : path;
    return `${environment.apiUrl}/${clean}`;
  }

  // =============================
  // MIN DATE
  // =============================
  get minDateTimeLocal(): string {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // =============================
  // DATE PREVIEW
  // =============================
  get datePreview(): { dateText: string; timeText: string } | null {
    if (!this.date) return null;
    const d = new Date(this.date);
    if (isNaN(d.getTime())) return null;

    const dateText = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);

    const timeText = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);

    return { dateText, timeText };
  }

  // =============================
  // FILE SELECT
  // =============================
  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file) return;

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => this.imagePreviewUrl = reader.result as string;
    reader.readAsDataURL(file);
  }

  // =============================
  // LOAD EVENT (EDIT MODE)
  // =============================
  loadEvent(id: string) {
    this.loading = true;

    this.es.getEventById(id).subscribe({
      next: (ev: any) => {
        this.title = ev.title || '';
        this.description = ev.description || '';
        this.date = ev.date ? ev.date.slice(0, 16) : '';
        this.venue = ev.venue || '';
        this.price = ev.price || 0;
        this.totalSeats = ev.totalSeats || 1;
        this.existingImageUrl = ev.imageUrl || null;
      },
      error: () => this.errorMessage = 'Failed to load event',
      complete: () => this.loading = false
    });
  }

  // =============================
  // SUBMIT
  // =============================
  submit(): void {

    if (!this.auth.isCreator() && !this.auth.isSuperAdmin()) {
      this.router.navigate(['/events']);
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.title.trim()) { this.errorMessage = 'Title required'; return; }
    if (!this.venue.trim()) { this.errorMessage = 'Venue required'; return; }
    if (!this.date) { this.errorMessage = 'Date required'; return; }
    if (this.totalSeats < 1) { this.errorMessage = 'Seats must be >= 1'; return; }
    if (this.price < 0) { this.errorMessage = 'Price cannot be negative'; return; }

    const fd = new FormData();
    fd.append('title', this.title.trim());
    fd.append('description', this.description.trim());
    fd.append('date', new Date(this.date).toISOString());
    fd.append('venue', this.venue.trim());
    fd.append('price', String(this.price));
    fd.append('totalSeats', String(this.totalSeats));

    if (this.selectedFile) {
      fd.append('image', this.selectedFile);
    }

    this.loading = true;

    if (this.isEdit && this.eventId) {

      this.es.updateEvent(this.eventId, fd).subscribe({
        next: () => {
          this.successMessage = 'Event Updated Successfully';
          setTimeout(() => this.router.navigate(['/dashboard']), 800);
        },
        error: err => {
          this.errorMessage = err?.error?.message || 'Update failed';
        },
        complete: () => this.loading = false
      });

    } else {

      this.es.createEvent(fd).subscribe({
        next: () => {
          this.successMessage = 'Event Created Successfully';
          setTimeout(() => this.router.navigate(['/dashboard']), 800);
        },
        error: err => {
          this.errorMessage = err?.error?.message || 'Create failed';
        },
        complete: () => this.loading = false
      });

    }
  }
}
