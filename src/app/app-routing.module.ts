import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomePageComponent } from './pages/home-page.component';
import { RoomPageComponent } from './pages/room-page.component';
import { BotPageComponent } from './pages/bot-page.component';
import { GameTablePageComponent } from './pages/game-table-page.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'room', component: RoomPageComponent },
  { path: 'bot', component: BotPageComponent },
  { path: 'game', component: GameTablePageComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
