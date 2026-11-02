import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-site-home',
  imports: [TranslatePipe, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  readonly pillars = [
    { titleKey: 'site.home.p1Title', bodyKey: 'site.home.p1Body' },
    { titleKey: 'site.home.p2Title', bodyKey: 'site.home.p2Body' },
    { titleKey: 'site.home.p3Title', bodyKey: 'site.home.p3Body' },
  ];
}
