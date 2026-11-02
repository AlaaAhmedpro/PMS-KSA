import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

interface EmployeeRow {
  name: string;
  nationalId: string;
  city: string;
  mobile: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
}

@Component({
  selector: 'app-employees-page',
  imports: [FormsModule, TranslatePipe, Button, InputText, TableModule, RouterLink],
  templateUrl: './employees.page.html',
  styleUrl: './employees.page.scss',
})
export class EmployeesPage {
  search = '';

  readonly employees = signal<EmployeeRow[]>([
    { name: 'عبدالله محمد العتيبي', nationalId: '1045829361', city: 'الرياض', mobile: '0551234567', role: 'مدير مشاريع', status: 'active' },
    { name: 'نورة سعد القحطاني', nationalId: '1087345620', city: 'جدة', mobile: '0549876543', role: 'محلل أعمال', status: 'active' },
    { name: 'خالد فهد الشمري', nationalId: '1092837465', city: 'الدمام', mobile: '0531122334', role: 'مهندس نظم', status: 'pending' },
    { name: 'سارة أحمد الغامدي', nationalId: '1029384756', city: 'المدينة المنورة', mobile: '0567788990', role: 'منسق مشاريع', status: 'suspended' },
    { name: 'فيصل عبدالرحمن الحربي', nationalId: '1019283746', city: 'أبها', mobile: '0503344556', role: 'أخصائي مالية', status: 'active' },
  ]);

  filtered(): EmployeeRow[] {
    const q = this.search.trim();
    if (!q) return this.employees();
    return this.employees().filter((e) => e.name.includes(q) || e.city.includes(q) || e.role.includes(q));
  }

  statusClass(status: EmployeeRow['status']): string {
    if (status === 'active') return 'status-badge status-badge--success';
    if (status === 'suspended') return 'status-badge status-badge--warning';
    return 'status-badge status-badge--neutral';
  }
}
