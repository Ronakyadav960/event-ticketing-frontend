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
  date = ''; // datetime-local string
  venue = '';
  price = 0;
  totalSeats = 1;

  // image upload
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;

  loading = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/events']);
      return;
    }

    const qpId = this.route.snapshot.queryParamMap.get('id');
    const pmId = this.route.snapshot.paramMap.get('id');
    this.eventId = qpId || pmId;

    if (this.eventId) {
      this.isEdit = true;
      this.loadEvent(this.eventId);
    }
  }

  // ✅ for image URL (no localhost)
  getImageUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.startsWith('/') ? path.substring(1) : path;
    return `${environment.apiUrl}/${clean}`;
  }

  // ✅ min datetime for input
  get minDateTimeLocal(): string {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ✅ THIS WAS MISSING → build error fix
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

  private isPastSelectedDate(): boolean {
    if (!this.date) return true;
    const selected = new Date(this.date);
    if (isNaN(selected.getTime())) return true;
    return selected.getTime() < Date.now();
  }

  onFileSelected(evt: Event): void {
    this.errorMessage = '';

    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0] || null;

    if (!file) {
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      input.value = '';
      this.errorMessage = 'Only JPG, PNG, or WEBP images are allowed.';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.selectedFile = null;
      this.imagePreviewUrl = null;
      input.value = '';
      this.errorMessage = 'Image must be 5MB or less.';
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.imagePreviewUrl = String(reader.result));
    reader.readAsDataURL(file);
  }

  loadEvent(id: string) {
    this.loading = true;
    this.errorMessage = '';

    this.es.getAdminEventById(id).subscribe({
      next: (event: any) => {
        const ev = event?.event ?? event?.data ?? event;

        this.title = ev?.title || '';
        this.description = ev?.description || '';
        this.date = ev?.date ? String(ev.date).slice(0, 16) : '';
        this.venue = ev?.venue || '';
        this.price = Number(ev?.price ?? 0);
        this.totalSeats = Number(ev?.totalSeats ?? 1);

        // ✅ image field (use ev.image; fallback for old keys)
        this.existingImageUrl = ev?.image || ev?.imageUrl || null;
      },
      error: () => (this.errorMessage = 'Event load failed.'),
      complete: () => (this.loading = false),
    });
  }

  submit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/events']);
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    if (!this.title.trim()) return void (this.errorMessage = 'Title is required.');
    if (!this.venue.trim()) return void (this.errorMessage = 'Venue is required.');
    if (!this.date) return void (this.errorMessage = 'Date & time is required.');
    if (this.isPastSelectedDate()) return void (this.errorMessage = 'Past date/time is not allowed.');
    if (Number(this.totalSeats) < 1) return void (this.errorMessage = 'Total seats must be at least 1.');
    if (Number(this.price) < 0) return void (this.errorMessage = 'Price cannot be negative.');

    const fd = new FormData();
    fd.append('title', this.title.trim());
    fd.append('description', this.description?.trim() || '');
    fd.append('date', new Date(this.date).toISOString());
    fd.append('venue', this.venue.trim());
    fd.append('price', String(Number(this.price)));
    fd.append('totalSeats', String(Number(this.totalSeats)));

    if (!this.isEdit) {
      fd.append('bookedSeats', '0');
    }

    if (this.selectedFile) {
      fd.append('image', this.selectedFile);
    }

    this.loading = true;

    if (this.isEdit && this.eventId) {
      this.es.updateAdminEvent(this.eventId, fd).subscribe({
        next: () => {
          this.successMessage = 'Event updated!';
          setTimeout(() => this.router.navigate(['/dashboard']), 600);
        },
        error: () => (this.errorMessage = 'Update failed.'),
        complete: () => (this.loading = false),
      });
    } else {
      this.es.createEvent(fd).subscribe({
        next: () => {
          this.successMessage = 'Event created!';
          setTimeout(() => this.router.navigate(['/events']), 600);
        },
        error: () => (this.errorMessage = 'Create failed.'),
        complete: () => (this.loading = false),
      });
    }
  }
}
