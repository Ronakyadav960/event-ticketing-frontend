import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';

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
  events: any[] = [];
  errorMsg = '';
  loading = false;
  showCreators = false;
  showEvents = true;
  showUsers = false;
  showCreatorModal = false;
  selectedCreator: any = null;

  eventSearch = '';
  userSearch = '';
  eventFilter: 'all' | 'upcoming' | 'past' = 'all';
  pageSize = 5;
  eventPage = 1;
  userPage = 1;
  creatorPage = 1;

  eventSortField: 'title' | 'date' | 'venue' | 'creator' = 'date';
  eventSortDir: 'asc' | 'desc' = 'asc';
  userSortField: 'name' | 'email' | 'role' = 'name';
  userSortDir: 'asc' | 'desc' = 'asc';
  creatorSortField: 'name' | 'email' | 'events' = 'name';
  creatorSortDir: 'asc' | 'desc' = 'asc';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.errorMsg = '';

    this.dashboardService.getSuperadminDashboard().subscribe({
      next: (res) => {
        this.data = res;
      },
      error: (err) => {
        console.error('Dashboard Load Error:', err);
        this.errorMsg = 'Failed to load dashboard.';
      }
    });

    this.dashboardService.getAllUsers().subscribe({
      next: (res: any) => {
        this.users = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('Users Load Error:', err);
        this.errorMsg ||= 'Failed to load users.';
      }
    });

    this.dashboardService.getAllEvents().subscribe({
      next: (res: any) => {
        this.events = Array.isArray(res) ? res : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Events Load Error:', err);
        this.errorMsg ||= 'Failed to load events.';
        this.loading = false;
      }
    });
  }

  toggleCreators() {
    this.showCreators = !this.showCreators;
  }

  openEvents() {
    this.showEvents = true;
    this.showUsers = false;
  }

  openUsers() {
    this.showUsers = true;
    this.showEvents = false;
  }

  openCreatorModal(c: any) {
    this.selectedCreator = c;
    this.showCreatorModal = true;
  }

  closeCreatorModal() {
    this.showCreatorModal = false;
    this.selectedCreator = null;
  }

  get upcomingEventsCount(): number {
    const now = Date.now();
    return this.events.filter(e => {
      const d = new Date(e?.date || 0).getTime();
      return !isNaN(d) && d >= now;
    }).length;
  }

  get pastEventsCount(): number {
    const now = Date.now();
    return this.events.filter(e => {
      const d = new Date(e?.date || 0).getTime();
      return !isNaN(d) && d < now;
    }).length;
  }

  get creatorsWithEventsCount(): number {
    return this.creatorsWithEvents.length;
  }

  get filteredEvents() {
    const q = this.eventSearch.trim().toLowerCase();
    const now = Date.now();

    return this.events.filter(e => {
      const title = String(e?.title || '').toLowerCase();
      const venue = String(e?.venue || '').toLowerCase();
      const creator = this.getCreatorName(e).toLowerCase();
      const d = new Date(e?.date || 0).getTime();

      const matchesText =
        !q || title.includes(q) || venue.includes(q) || creator.includes(q);

      const isUpcoming = !isNaN(d) && d >= now;
      const isPast = !isNaN(d) && d < now;

      const matchesFilter =
        this.eventFilter === 'all' ||
        (this.eventFilter === 'upcoming' && isUpcoming) ||
        (this.eventFilter === 'past' && isPast);

      return matchesText && matchesFilter;
    });
  }

  get sortedEvents() {
    const list = [...this.filteredEvents];
    return list.sort((a, b) => this.compareEvents(a, b));
  }

  get pagedEvents() {
    return this.paginate(this.sortedEvents, this.eventPage);
  }

  get eventPageCount() {
    return this.pageCount(this.sortedEvents.length);
  }

  get eventPageSafe() {
    return this.clampPage(this.eventPage, this.eventPageCount);
  }

  get filteredUsers() {
    const q = this.userSearch.trim().toLowerCase();
    return this.users.filter(u => {
      const name = String(u?.name || '').toLowerCase();
      const email = String(u?.email || '').toLowerCase();
      const role = String(u?.role || '').toLowerCase();
      return !q || name.includes(q) || email.includes(q) || role.includes(q);
    });
  }

  get sortedUsers() {
    const list = [...this.filteredUsers];
    return list.sort((a, b) => this.compareUsers(a, b));
  }

  get pagedUsers() {
    return this.paginate(this.sortedUsers, this.userPage);
  }

  get userPageCount() {
    return this.pageCount(this.sortedUsers.length);
  }

  get userPageSafe() {
    return this.clampPage(this.userPage, this.userPageCount);
  }

  get creatorsWithEvents() {
    const creators = this.users.filter(u => u.role === 'creator');
    const map = new Map<string, any>();

    creators.forEach(c => {
      map.set(String(c._id || c.id), {
        ...c,
        events: []
      });
    });

    this.events.forEach(e => {
      const id = String(e?.createdBy || '');
      if (map.has(id)) {
        map.get(id).events.push(e);
      }
    });

    return Array.from(map.values());
  }

  get sortedCreatorsWithEvents() {
    const list = [...this.creatorsWithEvents];
    return list.sort((a, b) => this.compareCreators(a, b));
  }

  get pagedCreatorsWithEvents() {
    return this.paginate(this.sortedCreatorsWithEvents, this.creatorPage);
  }

  get creatorPageCount() {
    return this.pageCount(this.sortedCreatorsWithEvents.length);
  }

  get creatorPageSafe() {
    return this.clampPage(this.creatorPage, this.creatorPageCount);
  }

  getCreatorName(event: any): string {
    const id = String(event?.createdBy || '');
    const user = this.users.find(u => String(u?._id || u?.id || '') === id);
    return user?.name || 'Unknown';
  }

  editEvent(e: any) {
    const id = String(e?._id || e?.id || '');
    if (!id) return;
    window.location.href = `/create-event?id=${id}`;
  }

  deleteEvent(e: any) {
    const id = String(e?._id || e?.id || '');
    if (!id) return;
    if (!confirm('Delete this event?')) return;

    this.dashboardService.deleteEvent(id).subscribe({
      next: () => this.loadDashboard(),
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
      next: () => this.loadDashboard(),
      error: (err) => console.error('Delete User Error:', err)
    });
  }

  private compareEvents(a: any, b: any) {
    const dir = this.eventSortDir === 'asc' ? 1 : -1;
    const aVal = this.getEventSortValue(a);
    const bVal = this.getEventSortValue(b);
    return this.compareValues(aVal, bVal) * dir;
  }

  private compareUsers(a: any, b: any) {
    const dir = this.userSortDir === 'asc' ? 1 : -1;
    const aVal = this.getUserSortValue(a);
    const bVal = this.getUserSortValue(b);
    return this.compareValues(aVal, bVal) * dir;
  }

  private compareCreators(a: any, b: any) {
    const dir = this.creatorSortDir === 'asc' ? 1 : -1;
    const aVal = this.getCreatorSortValue(a);
    const bVal = this.getCreatorSortValue(b);
    return this.compareValues(aVal, bVal) * dir;
  }

  private getEventSortValue(e: any) {
    if (this.eventSortField === 'date') {
      const d = new Date(e?.date || 0).getTime();
      return isNaN(d) ? 0 : d;
    }
    if (this.eventSortField === 'venue') {
      return String(e?.venue || '').toLowerCase();
    }
    if (this.eventSortField === 'creator') {
      return this.getCreatorName(e).toLowerCase();
    }
    return String(e?.title || '').toLowerCase();
  }

  private getUserSortValue(u: any) {
    if (this.userSortField === 'email') {
      return String(u?.email || '').toLowerCase();
    }
    if (this.userSortField === 'role') {
      return String(u?.role || '').toLowerCase();
    }
    return String(u?.name || '').toLowerCase();
  }

  private getCreatorSortValue(c: any) {
    if (this.creatorSortField === 'email') {
      return String(c?.email || '').toLowerCase();
    }
    if (this.creatorSortField === 'events') {
      return Number(c?.events?.length || 0);
    }
    return String(c?.name || '').toLowerCase();
  }

  private compareValues(a: string | number, b: string | number) {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    const aStr = String(a);
    const bStr = String(b);
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
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
}
