import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

interface DemoRequestRow {
  org: string;
  contact: string;
  mobile: string;
  city: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  date: string;
}

@Component({
  selector: 'app-demo-requests-page',
  imports: [FormsModule, TranslatePipe, InputText, TableModule],
  templateUrl: './demo-requests.page.html',
  styleUrl: './demo-requests.page.scss',
})
export class DemoRequestsPage {
  search = '';

  readonly rows = signal<DemoRequestRow[]>([
    { org: 'شركة البناء المتكامل', contact: 'مشعل العتيبي', mobile: '0553344556', city: 'الرياض', status: 'new', date: '2026-10-28' },
    { org: 'أمانة المدينة المنورة', contact: 'هند الغامدي', mobile: '0541122334', city: 'المدينة المنورة', status: 'contacted', date: '2026-10-27' },
    { org: 'مجموعة البحر الأحمر', contact: 'فهد الشمري', mobile: '0539988776', city: 'جدة', status: 'qualified', date: '2026-10-25' },
    { org: 'مؤسسة وادي نجران', contact: 'سارة الحربي', mobile: '0506677889', city: 'أبها', status: 'closed', date: '2026-10-20' },
  ]);

  filtered(): DemoRequestRow[] {
    const q = this.search.trim();
    if (!q) return this.rows();
    return this.rows().filter((r) => r.org.includes(q) || r.contact.includes(q) || r.city.includes(q));
  }

  statusClass(status: DemoRequestRow['status']): string {
    if (status === 'new') return 'status-badge status-badge--info';
    if (status === 'contacted') return 'status-badge status-badge--neutral';
    if (status === 'qualified') return 'status-badge status-badge--success';
    return 'status-badge status-badge--warning';
  }
}
