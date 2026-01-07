import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { GameService } from '../services/game.service';

@Component({
  selector: 'app-game-table-page',
  templateUrl: './game-table-page.component.html'
})
export class GameTablePageComponent {
  modeLabel = '';
  roomId = '';

  constructor(private route: ActivatedRoute, public gameService: GameService) {
    this.route.queryParams.subscribe((params) => {
      this.roomId = params['room'] ?? 'LOCAL';
      const mode = params['mode'] ?? 'throw-in';
      this.modeLabel = mode === 'transfer' ? 'Переводной' : 'Подкидной';
      this.gameService.setupRoomMatch({ roomId: this.roomId, mode });
    });
  }
}
