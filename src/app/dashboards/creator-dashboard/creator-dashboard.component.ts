import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-creator-dashboard',
  imports: [CommonModule],
  templateUrl: './creator-dashboard.component.html',
  styleUrls: ['./creator-dashboard.component.css']
})
export class CreatorDashboardComponent implements OnInit {

  data: any;
  loading = false;
  errorMsg = '';
  selectedBox: 'events' | 'bookers' | 'seats' | 'revenue' | 'top' | null = null;

  detailModalOpen = false;
  detailKind: 'events' | 'bookers' | 'seats' | 'revenue' | 'top' | null = null;
  detailItem: any = null;

  constructor(private dashboardService: DashboardService, private router: Router) {}

  ngOnInit() {
    this.loading = true;
    this.dashboardService.getCreatorDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Creator dashboard error:', err);
        this.errorMsg = 'Failed to load dashboard.';
        this.loading = false;
      }
    });
  }

  selectBox(key: 'events' | 'bookers' | 'seats' | 'revenue' | 'top') {
    this.selectedBox = this.selectedBox === key ? null : key;
  }

  openDetails(kind: 'events' | 'bookers' | 'seats' | 'revenue' | 'top', item: any) {
    this.detailKind = kind;
    this.detailItem = item;
    this.detailModalOpen = true;
  }

  closeDetails() {
    this.detailModalOpen = false;
    this.detailKind = null;
    this.detailItem = null;
  }

  viewEventFromModal() {
    const id = String(this.detailItem?.eventId || this.detailItem?._id || this.detailItem?.id || '');
    if (!id) return;
    this.closeDetails();
    this.router.navigate(['/events', id]);
  }

  editEventFromModal() {
    const id = String(this.detailItem?.eventId || this.detailItem?._id || this.detailItem?.id || '');
    if (!id) return;
    this.closeDetails();
    this.router.navigate(['/create-event'], { queryParams: { id } });
  }

  get perEvent(): any[] {
    const list = this.data?.perEvent;
    return Array.isArray(list) ? list : [];
  }

  get eventsCount(): number {
    const v = this.data?.totals?.events;
    return typeof v === 'number' ? v : this.perEvent.length;
  }

  get totalBookings(): number {
    const v = this.data?.totals?.bookings;
    if (typeof v === 'number') return v;
    return this.perEvent.reduce((sum, e) => sum + Number(e?.bookings || 0), 0);
  }

  get totalRevenue(): number {
    const v = this.data?.totals?.revenue;
    if (typeof v === 'number') return v;
    return this.perEvent.reduce((sum, e) => sum + Number(e?.revenue || 0), 0);
  }

  get topEvent(): any {
    return this.data?.topEvent || null;
  }

  get uniqueBookers(): any[] {
    const list = this.data?.bookings || this.data?.recentBookings || [];
    if (!Array.isArray(list)) return [];
    const map = new Map<string, any>();
    list.forEach((b: any) => {
      const u = b?.user || b?.userId || {};
      const key = String(u?._id || u?.id || u?.email || b?.email || b?.name || '');
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          name: u?.name || b?.name || 'User',
          email: u?.email || b?.email || '-',
          eventTitle: b?.event?.title || b?.eventTitle || ''
        });
      }
    });
    return Array.from(map.values());
  }

  get seatsLeftPerEvent(): any[] {
    return this.perEvent.map((e) => {
      const total =
        Number(e?.totalSeats ?? e?.seats ?? e?.capacity ?? e?.total ?? 0);
      const booked =
        Number(e?.seatsBooked ?? e?.bookings ?? e?.seats ?? 0);
      const left =
        total > 0 ? Math.max(0, total - booked) : null;
      return {
        title: e?.title || 'Event',
        left
      };
    });
  }

  get graphBars(): number[] {
    const counts = this.perEvent.map((e) => Number(e?.bookings || 0));
    return this.normalizeBars(counts);
  }

  get graphSeries(): { label: string; count: number; height: number }[] {
    const counts = this.perEvent.map((e) => Number(e?.bookings || 0));
    const heights = this.normalizeBars(counts);
    return this.perEvent.map((e, i) => ({
      label: `${i + 1}. ${e?.title || 'Event'}`,
      count: Number(e?.bookings || 0),
      height: heights[i] ?? 0
    }));
  }

  private normalizeBars(values: number[]): number[] {
    if (!values.length) return [0, 0, 0, 0];
    const max = Math.max(...values, 1);
    return values.map(v => Math.round((v / max) * 100));
  }
}
