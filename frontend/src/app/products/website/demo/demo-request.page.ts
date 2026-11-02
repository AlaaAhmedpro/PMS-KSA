import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

@Component({
  selector: 'app-site-demo-request',
  imports: [FormsModule, TranslatePipe, Button, InputText, Select, Textarea],
  templateUrl: './demo-request.page.html',
  styleUrl: './demo-request.page.scss',
})
export class DemoRequestPage {
  orgName = '';
  contactName = '';
  mobile = '';
  email = '';
  city: string | null = null;
  notes = '';
  readonly submitted = signal(false);

  readonly cities = [
    { label: 'الرياض', value: 'riyadh' },
    { label: 'جدة', value: 'jeddah' },
    { label: 'الدمام', value: 'dammam' },
    { label: 'المدينة المنورة', value: 'madinah' },
    { label: 'أبها', value: 'abha' },
  ];

  submit(): void {
    if (!this.orgName.trim() || !this.contactName.trim() || !this.mobile.trim() || !this.email.trim() || !this.city) {
      return;
    }
    this.submitted.set(true);
  }
}
