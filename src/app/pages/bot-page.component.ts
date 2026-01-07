import { Component } from '@angular/core';

import { BotProfile, GameService } from '../services/game.service';

@Component({
  selector: 'app-bot-page',
  templateUrl: './bot-page.component.html'
})
export class BotPageComponent {
  difficulties: BotProfile[] = [
    {
      id: 'easy',
      label: 'Лёгкий',
      description: 'Бот подсказывает ходы и прощает ошибки.'
    },
    {
      id: 'normal',
      label: 'Средний',
      description: 'Классическая партия с равным соперником.'
    },
    {
      id: 'hard',
      label: 'Сложный',
      description: 'Бот активно переводит и выстраивает комбинации.'
    }
  ];

  selected = this.difficulties[1];
  mode: 'throw-in' | 'transfer' = 'throw-in';

  constructor(public gameService: GameService) {}

  startBotMatch() {
    this.gameService.configureBotMatch({
      mode: this.mode,
      bot: this.selected
    });
  }
}
