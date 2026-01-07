import { Component } from '@angular/core';

type Screen =
  | 'menu'
  | 'bluetooth'
  | 'lobby'
  | 'bot'
  | 'game'
  | 'rules'
  | 'settings'
  | 'end';

type BotDifficulty = 'Лёгкий' | 'Средний' | 'Тяжёлый';

type GameMode = 'Подкидной' | 'Переводной';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  screen: Screen = 'menu';
  statusMessage = 'Оффлайн: готово к игре';
  toastMessage = '';
  selectedCardId: string | null = null;

  rooms = [
    { name: 'Комната Ujiu', signal: 'Сильный', status: 'свободно' },
    { name: 'Nordic Table', signal: 'Средний', status: 'занято' },
    { name: 'Вечерняя партия', signal: 'Слабый', status: 'свободно' }
  ];

  lobbyPlayers = [
    { name: 'Вы (Host)', status: 'готов' },
    { name: 'Игрок 2', status: 'ожидание' }
  ];

  botDifficulty: BotDifficulty = 'Средний';
  botMode: GameMode = 'Подкидной';
  deckSize = 36;
  confirmMove = true;
  animationSpeed = 'Нормально';
  soundEnabled = true;
  highlightMoves = true;

  handCards = [
    { id: '6s', rank: '6', suit: '♠', color: 'black' },
    { id: '8d', rank: '8', suit: '♦', color: 'red' },
    { id: '10h', rank: '10', suit: '♥', color: 'red' },
    { id: 'jc', rank: 'J', suit: '♣', color: 'black' },
    { id: 'qs', rank: 'Q', suit: '♠', color: 'black' },
    { id: 'ad', rank: 'A', suit: '♦', color: 'red' }
  ];
  tablePairs = [
    {
      attack: { id: '9c', rank: '9', suit: '♣', color: 'black' },
      defense: { id: 'jc', rank: 'J', suit: '♣', color: 'black' }
    },
    {
      attack: { id: '7d', rank: '7', suit: '♦', color: 'red' },
      defense: null
    }
  ];

  endStats = {
    duration: '07:42',
    moves: 28,
    takes: 3
  };

  goTo(screen: Screen): void {
    this.screen = screen;
    this.toastMessage = '';
  }

  selectCard(cardId: string): void {
    this.selectedCardId = this.selectedCardId === cardId ? null : cardId;
  }

  playSelected(): void {
    if (!this.selectedCardId) {
      this.toastMessage = 'Сначала выберите карту.';
      return;
    }

    const selectedCard = this.handCards.find((card) => card.id === this.selectedCardId);
    const label = selectedCard ? `${selectedCard.rank}${selectedCard.suit}` : 'карта';

    this.toastMessage = `Карта ${label} сыграна (демо).`;
    this.selectedCardId = null;
  }

  showInvalidMove(): void {
    this.toastMessage = 'Нельзя: нужно бить старше той же мастью или козырем.';
  }
}
