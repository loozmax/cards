import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html'
})
export class HomePageComponent {
  modes = [
    { id: 'throw-in', title: 'Подкидной' },
    { id: 'transfer', title: 'Переводной' }
  ];
}
