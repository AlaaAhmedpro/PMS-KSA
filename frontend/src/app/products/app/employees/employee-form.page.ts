import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-employee-form-page',
  imports: [FormsModule, TranslatePipe, Button, InputText, Select, RouterLink],
  templateUrl: './employee-form.page.html',
  styleUrl: './employee-form.page.scss',
})
export class EmployeeFormPage {
  private readonly router = inject(Router);

  name = '';
  nationalId = '';
  mobile = '';
  city: string | null = null;
  role: string | null = null;
  readonly saved = signal(false);

  readonly cities = [
    { label: 'الرياض', value: 'riyadh' },
    { label: 'جدة', value: 'jeddah' },
    { label: 'الدمام', value: 'dammam' },
    { label: 'المدينة المنورة', value: 'madinah' },
    { label: 'أبها', value: 'abha' },
  ];

  readonly roles = [
    { label: 'مدير مشاريع', value: 'pm' },
    { label: 'محلل أعمال', value: 'ba' },
    { label: 'مهندس نظم', value: 'se' },
    { label: 'منسق مشاريع', value: 'pc' },
  ];

  save(): void {
    if (!this.name.trim() || !this.nationalId.trim() || !this.mobile.trim() || !this.city || !this.role) {
      return;
    }
    this.saved.set(true);
    window.setTimeout(() => {
      void this.router.navigateByUrl('/app/employees');
    }, 500);
  }
}
