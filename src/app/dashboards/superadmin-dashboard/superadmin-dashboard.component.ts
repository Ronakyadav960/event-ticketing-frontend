import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { BookingService } from '../../services/booking.service';

@Component({
  standalone: true,
  selector: 'app-superadmin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.css']
})
export class SuperadminDashboardComponent implements OnInit {

  data: any;
  users: any[] = [];
  creators: any[] = [];
  events: any[] = [];
  bookings: any[] = [];
  usersAll: any[] = [];
  eventsAll: any[] = [];
  bookingsAll: any[] = [];
  usersTotal = 0;
  creatorsTotal = 0;
  eventsTotal = 0;
  bookingsTotal = 0;
  usersTotalPages = 1;
  creatorsTotalPages = 1;
  eventsTotalPages = 1;
  bookingsTotalPages = 1;
  errorMsg = '';
  loading = false;
  loadingUsers = false;
  loadingEvents = false;
  loadingBookings = false;
  showCreatorModal = false;
  selectedCreator: any = null;
  selectedTop: 'creators' | 'users' | 'events' | 'bookings' | null = null;
  selectedSecondary: 'upcoming' | 'creatorsWithEvents' | 'past' | null = null;

  pageSize = 5;
  eventPage = 1;
  userPage = 1;
  creatorPage = 1;
  bookingPage = 1;
  graphMonth = '';
  graphFrom = '';
  graphTo = '';

  constructor(
    private dashboardService: DashboardService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboard();
    this.graphMonth = this.getCurrentMonth();
    this.ensureEventsLoadedAll();
  }

  loadDashboard() {
    this.loading = true;
    this.errorMsg = '';

    this.dashboardService.getSuperadminDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Dashboard Load Error:', err);
        this.errorMsg = 'Failed to load dashboard.';
        this.loading = false;
      }
    });
  }

  openCreatorModal(c: any) {
    this.selectedCreator = c;
    this.showCreatorModal = true;
  }

  closeCreatorModal() {
    this.showCreatorModal = false;
    this.selectedCreator = null;
  }

  selectTop(key: 'creators' | 'users' | 'events' | 'bookings') {
    this.selectedTop = this.selectedTop === key ? null : key;
    if (!this.selectedTop) {
      this.selectedSecondary = null;
      return;
    }
    if (this.selectedTop === 'users') {
      this.userPage = 1;
      this.loadUsersPage('user', this.userPage);
    }
    if (this.selectedTop === 'creators') {
      this.creatorPage = 1;
      this.loadUsersPage('creator', this.creatorPage);
    }
    if (this.selectedTop === 'events') {
      this.eventPage = 1;
      this.loadEventsPage(this.eventPage);
    }
    if (this.selectedTop === 'bookings') {
      this.bookingPage = 1;
      this.loadBookingsPage(this.bookingPage);
    }
  }

  selectSecondary(key: 'upcoming' | 'creatorsWithEvents' | 'past') {
    if (!this.selectedTop) return;
    this.selectedSecondary = this.selectedSecondary === key ? null : key;
    if (!this.selectedSecondary) return;
    if (this.selectedSecondary === 'upcoming' || this.selectedSecondary === 'past') {
      this.ensureEventsLoadedAll();
    }
    if (this.selectedSecondary === 'creatorsWithEvents') {
      this.ensureUsersLoadedAll();
      this.ensureEventsLoadedAll();
    }
  }

  get totalCreators(): number {
    const v = (this.data as any)?.totals?.creators;
    if (typeof v === 'number') return v;
    if (this.creatorsTotal) return this.creatorsTotal;
    return this.creators.length;
  }

  get totalUsersCount(): number {
    const v = (this.data as any)?.totals?.users;
    if (typeof v === 'number') return v;
    if (this.usersTotal) return this.usersTotal;
    return this.users.length;
  }

  get totalEventsCount(): number {
    const v = (this.data as any)?.totals?.events;
    if (typeof v === 'number') return v;
    if (this.eventsTotal) return this.eventsTotal;
    return this.events.length;
  }

  get totalBookingsCount(): number {
    const v = (this.data as any)?.totals?.bookings;
    if (typeof v === 'number') return v;
    if (this.bookingsTotal) return this.bookingsTotal;
    return this.bookingsAll.length || this.bookings.length;
  }

  get creatorUsers(): any[] {
    return this.creators;
  }

  get onlyUsers(): any[] {
    return this.users;
  }

  get pagedCreators(): any[] {
    return this.creators;
  }

  get creatorPageCount(): number {
    return this.creatorsTotalPages;
  }

  get creatorPageSafe(): number {
    return this.clampPage(this.creatorPage, this.creatorPageCount);
  }

  get pagedUsers(): any[] {
    return this.users;
  }

  get userPageCount(): number {
    return this.usersTotalPages;
  }

  get userPageSafe(): number {
    return this.clampPage(this.userPage, this.userPageCount);
  }

  get pagedEvents(): any[] {
    return this.events;
  }

  get eventPageCount(): number {
    return this.eventsTotalPages;
  }

  get eventPageSafe(): number {
    return this.clampPage(this.eventPage, this.eventPageCount);
  }

  get pagedBookings(): any[] {
    return this.bookings;
  }

  get bookingPageCount(): number {
    return this.bookingsTotalPages;
  }

  get bookingPageSafe(): number {
    return this.clampPage(this.bookingPage, this.bookingPageCount);
  }

  get graphBars(): number[] {
    if (!this.eventsAll.length) return [0, 0, 0, 0];
    const range = this.getGraphRange();
    if (!range) return [0, 0, 0, 0];
    const weekly = this.getWeeklyEventCounts(range.start, range.end);
    return this.normalizeBars(weekly);
  }

  get graphBuckets(): { label: string; count: number; height: number }[] {
    if (!this.eventsAll.length) return [];
    const range = this.getGraphRange();
    if (!range) return [];
    const buckets = this.getWeeklyEventBuckets(range.start, range.end);
    const counts = buckets.map(b => b.count);
    const heights = this.normalizeBars(counts);
    return buckets.map((b, i) => ({
      label: b.label,
      count: counts[i] ?? 0,
      height: heights[i] ?? 0
    }));
  }

  get graphNote(): string {
    if (!this.eventsAll.length) return 'Load events to view weekly graph';
    const range = this.getGraphRange();
    if (!range) return 'Select month or date range';
    const start = range.start.toISOString().slice(0, 10);
    const end = range.end.toISOString().slice(0, 10);
    return `Weekly growth (${start} to ${end})`;
  }

  onGraphFilterChange() {
    this.ensureEventsLoadedAll();
  }

  private getGraphRange(): { start: Date; end: Date } | null {
    if (this.graphFrom && this.graphTo) {
      const s = new Date(this.graphFrom);
      const e = new Date(this.graphTo);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
      if (s > e) return null;
      return { start: this.startOfDay(s), end: this.endOfDay(e) };
    }

    if (this.graphMonth) {
      const [y, m] = this.graphMonth.split('-').map(Number);
      if (!y || !m) return null;
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { start: this.startOfDay(start), end: this.endOfDay(end) };
    }

    return null;
  }

  private getWeeklyEventBuckets(
    start: Date,
    end: Date
  ): { label: string; start: Date; end: Date; count: number }[] {
    const weeks: { label: string; start: Date; end: Date; count: number }[] = [];
    let cursor = new Date(start);
    let index = 1;
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const cappedEnd = weekEnd > end ? end : weekEnd;

      const count = this.eventsAll.filter((e) => {
        const d = new Date(e?.date || 0);
        if (isNaN(d.getTime())) return false;
        return d >= weekStart && d <= cappedEnd;
      }).length;

      const label = `W${index} ${this.formatShortDate(weekStart)}-${this.formatShortDate(cappedEnd)}`;
      weeks.push({ label, start: weekStart, end: cappedEnd, count });
      cursor.setDate(cursor.getDate() + 7);
      index += 1;
    }
    return weeks;
  }
  private getWeeklyEventCounts(start: Date, end: Date): number[] {
    const weeks: number[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const cappedEnd = weekEnd > end ? end : weekEnd;

      const count = this.eventsAll.filter((e) => {
        const d = new Date(e?.date || 0);
        if (isNaN(d.getTime())) return false;
        return d >= weekStart && d <= cappedEnd;
      }).length;

      weeks.push(count);
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks.length ? weeks : [0, 0, 0, 0];
  }

  get upcomingEventsCount(): number {
    const now = Date.now();
    const list = this.eventsAll.length ? this.eventsAll : this.events;
    return list.filter(e => {
      const d = new Date(e?.date || 0).getTime();
      return !isNaN(d) && d >= now;
    }).length;
  }

  get pastEventsCount(): number {
    const now = Date.now();
    const list = this.eventsAll.length ? this.eventsAll : this.events;
    return list.filter(e => {
      const d = new Date(e?.date || 0).getTime();
      return !isNaN(d) && d < now;
    }).length;
  }

  get creatorsWithEventsCount(): number {
    return this.creatorsWithEvents.length;
  }

  get creatorsWithEvents() {
    const users = this.usersAll.length ? this.usersAll : [...this.creators, ...this.users];
    const events = this.eventsAll.length ? this.eventsAll : this.events;
    if (!users.length || !events.length) return [];
    const creators = users.filter(u => u.role === 'creator');
    const map = new Map<string, any>();

    creators.forEach(c => {
      map.set(String(c._id || c.id), {
        ...c,
        events: []
      });
    });

    events.forEach(e => {
      const id = String(e?.createdBy || '');
      if (map.has(id)) {
        map.get(id).events.push(e);
      }
    });

    return Array.from(map.values());
  }

  getCreatorName(event: any): string {
    const pool = this.usersAll.length ? this.usersAll : [...this.creators, ...this.users];
    const id = String(event?.createdBy || '');
    const user = pool.find(u => String(u?._id || u?.id || '') === id);
    return user?.name || 'Unknown';
  }

  editEvent(e: any) {
    const id = String(e?._id || e?.id || '');
    if (!id) return;
    this.router.navigate(['/create-event'], { queryParams: { id } });
  }

  deleteEvent(e: any) {
    const id = String(e?._id || e?.id || '');
    if (!id) return;
    if (!confirm('Delete this event?')) return;

    this.dashboardService.deleteEvent(id).subscribe({
      next: () => {
        const matcher = (x: any) => String(x?._id || x?.id || '') !== id;
        this.events = this.events.filter(matcher);
        this.eventsAll = this.eventsAll.filter(matcher);
        this.adjustTotal('events', -1);
        this.eventsTotal = Math.max(0, this.eventsTotal - 1);
      },
      error: (err) => console.error('Delete Event Error:', err)
    });
  }

  editUser(u: any) {
    const id = String(u?._id || u?.id || '');
    if (!id) return;

    const name = prompt('Update name', u?.name || '');
    if (name == null) return;
    const role = prompt('Update role (user/creator/superadmin)', u?.role || '');
    if (role == null) return;

    this.dashboardService.updateUser(id, { name, role }).subscribe({
      next: () => this.loadDashboard(),
      error: (err) => console.error('Update User Error:', err)
    });
  }

  deleteUser(u: any) {
    const id = String(u?._id || u?.id || '');
    if (!id) return;
    if (!confirm('Delete this user?')) return;

    this.dashboardService.deleteUser(id).subscribe({
      next: () => {
        const role = String(u?.role || '');
        const matcher = (x: any) => String(x?._id || x?.id || '') !== id;
        this.users = this.users.filter(matcher);
        this.creators = this.creators.filter(matcher);
        this.usersAll = this.usersAll.filter(matcher);
        this.adjustTotal('users', -1);
        this.usersTotal = Math.max(0, this.usersTotal - 1);
        if (role === 'creator') {
          this.adjustTotal('creators', -1);
          this.creatorsTotal = Math.max(0, this.creatorsTotal - 1);
        }
      },
      error: (err) => console.error('Delete User Error:', err)
    });
  }

  deleteBooking(b: any) {
    const id = String(b?._id || b?.id || '');
    if (!id) return;
    if (!confirm('Delete this booking?')) return;

    this.bookingService.deleteBooking(id).subscribe({
      next: () => {
        const matcher = (x: any) => String(x?._id || x?.id || '') !== id;
        this.bookings = this.bookings.filter(matcher);
        this.bookingsAll = this.bookingsAll.filter(matcher);
        this.adjustTotal('bookings', -1);
        this.bookingsTotal = Math.max(0, this.bookingsTotal - 1);
      },
      error: (err) => console.error('Delete Booking Error:', err)
    });
  }

  goCreatorPage(next: number) {
    this.creatorPage = this.clampPage(next, this.creatorPageCount);
    this.loadUsersPage('creator', this.creatorPage);
  }

  goUserPage(next: number) {
    this.userPage = this.clampPage(next, this.userPageCount);
    this.loadUsersPage('user', this.userPage);
  }

  goEventPage(next: number) {
    this.eventPage = this.clampPage(next, this.eventPageCount);
    this.loadEventsPage(this.eventPage);
  }

  goBookingPage(next: number) {
    this.bookingPage = this.clampPage(next, this.bookingPageCount);
    this.loadBookingsPage(this.bookingPage);
  }
  private paginate<T>(list: T[], page: number): T[] {
    const safePage = this.clampPage(page, this.pageCount(list.length));
    const start = (safePage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  private pageCount(total: number) {
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  private clampPage(page: number, totalPages: number) {
    return Math.min(Math.max(page, 1), totalPages);
  }

  private loadUsersPage(role: 'user' | 'creator', page: number) {
    if (this.loadingUsers) return;
    this.loadingUsers = true;
    this.dashboardService.getAllUsers({ page, limit: this.pageSize, role }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.users || []);
        const total = Array.isArray(res) ? list.length : (res?.total ?? list.length);
        const totalPages = Array.isArray(res)
          ? this.pageCount(total)
          : (res?.totalPages ?? this.pageCount(total));

        if (role === 'creator') {
          this.creators = list;
          this.creatorsTotal = total;
          this.creatorsTotalPages = totalPages;
        } else {
          this.users = list;
          this.usersTotal = total;
          this.usersTotalPages = totalPages;
        }

        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Users Load Error:', err);
        this.errorMsg ||= 'Failed to load users.';
        this.loadingUsers = false;
      }
    });
  }

  private ensureUsersLoadedAll() {
    if (this.usersAll.length || this.loadingUsers) return;
    this.loadingUsers = true;
    this.dashboardService.getAllUsers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.users || []);
        this.usersAll = list;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Users Load Error:', err);
        this.errorMsg ||= 'Failed to load users.';
        this.loadingUsers = false;
      }
    });
  }

  private loadEventsPage(page: number) {
    if (this.loadingEvents) return;
    this.loadingEvents = true;
    this.dashboardService.getAllEvents({ page, limit: this.pageSize }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.events || []);
        const total = Array.isArray(res) ? list.length : (res?.total ?? list.length);
        const totalPages = Array.isArray(res)
          ? this.pageCount(total)
          : (res?.totalPages ?? this.pageCount(total));
        this.events = list;
        this.eventsTotal = total;
        this.eventsTotalPages = totalPages;
        this.loadingEvents = false;
      },
      error: (err) => {
        console.error('Events Load Error:', err);
        this.errorMsg ||= 'Failed to load events.';
        this.loadingEvents = false;
      }
    });
  }

  private ensureEventsLoadedAll() {
    if (this.eventsAll.length || this.loadingEvents) return;
    this.loadingEvents = true;
    this.dashboardService.getAllEvents().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.events || []);
        this.eventsAll = list;
        this.loadingEvents = false;
      },
      error: (err) => {
        console.error('Events Load Error:', err);
        this.errorMsg ||= 'Failed to load events.';
        this.loadingEvents = false;
      }
    });
  }

  private loadBookingsPage(page: number) {
    if (this.loadingBookings) return;
    this.loadingBookings = true;
    this.bookingService.getAllBookings({ page, limit: this.pageSize }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.bookings || []);
        const total = Array.isArray(res) ? list.length : (res?.total ?? list.length);
        const totalPages = Array.isArray(res)
          ? this.pageCount(total)
          : (res?.totalPages ?? this.pageCount(total));
        this.bookings = list;
        this.bookingsTotal = total;
        this.bookingsTotalPages = totalPages;
        this.loadingBookings = false;
      },
      error: (err) => {
        console.error('Bookings Load Error:', err);
        this.errorMsg ||= 'Failed to load bookings.';
        this.loadingBookings = false;
      }
    });
  }

  private ensureBookingsLoadedAll() {
    if (this.bookingsAll.length || this.loadingBookings) return;
    this.loadingBookings = true;
    this.bookingService.getAllBookings().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.bookings || []);
        this.bookingsAll = list;
        this.loadingBookings = false;
      },
      error: (err) => {
        console.error('Bookings Load Error:', err);
        this.errorMsg ||= 'Failed to load bookings.';
        this.loadingBookings = false;
      }
    });
  }

  private getCurrentMonth(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }

  private normalizeBars(values: number[]): number[] {
    const max = Math.max(...values, 1);
    return values.map(v => Math.round((v / max) * 100));
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  private formatShortDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  private getTopEventIds(start: Date, end: Date, limit: number): string[] {
    const map = new Map<string, number>();
    this.eventsAll.forEach((e) => {
      const d = new Date(e?.date || 0);
      if (isNaN(d.getTime()) || d < start || d > end) return;
      const id = String(e?._id || e?.id || '');
      if (!id) return;
      map.set(id, (map.get(id) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  private countEventInRange(id: string, start: Date, end: Date): number {
    return this.eventsAll.filter((e) => {
      const eid = String(e?._id || e?.id || '');
      if (eid !== id) return false;
      const d = new Date(e?.date || 0);
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    }).length;
  }

  private getEventTitle(id: string): string {
    const ev = this.eventsAll.find(e => String(e?._id || e?.id || '') === id);
    return ev?.title || 'Event';
  }


  private adjustTotal(key: 'users' | 'creators' | 'events' | 'bookings', delta: number) {
    if (!this.data) return;
    const totals = (this.data as any).totals;
    if (!totals || typeof totals[key] !== 'number') return;
    totals[key] = Math.max(0, totals[key] + delta);
  }
}
