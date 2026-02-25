import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { BookingService } from '../../services/booking.service';
import { finalize, take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-booking-history',
  imports: [CommonModule, RouterLink, QRCodeComponent],
  templateUrl: './booking-history.component.html',
  styleUrls: ['./booking-history.component.css']
})
export class BookingHistoryComponent implements OnInit {
  private bs = inject(BookingService);
  private cdr = inject(ChangeDetectorRef);

  bookings: any[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loading = true;
    this.error = '';

    this.bs.getMyBookings()
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          this.bookings = this.sortBookings(list);
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.error =
            err?.error?.message ||
            err?.message ||
            'Unable to load booking history.';
          console.error('getMyBookings error:', err);
          this.cdr.detectChanges();
        }
      });
  }

  private sortBookings(list: any[]) {
    const copy = [...list];
    return copy.sort((a, b) => this.getBookingTime(b) - this.getBookingTime(a));
  }

  private getBookingTime(b: any) {
    const d = new Date(b?.event?.date || b?.createdAt || 0).getTime();
    return isNaN(d) ? 0 : d;
  }
}
