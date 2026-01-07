import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HomePageComponent } from './pages/home-page.component';
import { RoomPageComponent } from './pages/room-page.component';
import { BotPageComponent } from './pages/bot-page.component';
import { GameTablePageComponent } from './pages/game-table-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    RoomPageComponent,
    BotPageComponent,
    GameTablePageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
