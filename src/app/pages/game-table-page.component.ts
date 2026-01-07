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
  private dragContext: { source: 'hand' | 'table'; index: number } | null = null;

  constructor(private route: ActivatedRoute, public gameService: GameService) {
    this.route.queryParams.subscribe((params) => {
      this.roomId = params['room'] ?? 'LOCAL';
      const mode = params['mode'] ?? 'throw-in';
      this.modeLabel = mode === 'transfer' ? 'Переводной' : 'Подкидной';
      this.gameService.setupRoomMatch({ roomId: this.roomId, mode });
    });
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  onDragStart(source: 'hand' | 'table', index: number) {
    this.dragContext = { source, index };
  }

  onDropOnPile() {
    if (!this.dragContext) {
      return;
    }

    if (this.dragContext.source === 'hand') {
      const [card] = this.gameService.playerHand.splice(this.dragContext.index, 1);
      if (card) {
        if (!this.gameService.canAttackWith(card)) {
          this.gameService.playerHand.splice(this.dragContext.index, 0, card);
          this.gameService.statusMessage = 'Эту карту нельзя подкинуть по правилам.';
        } else {
          this.gameService.tableCards.push(card);
          this.gameService.statusMessage = 'Карта атакует. Можно подкинуть по рангу.';
        }
      }
    }

    this.dragContext = null;
  }

  onDropOnTable(targetIndex: number) {
    if (!this.dragContext) {
      return;
    }

    if (this.dragContext.source === 'hand') {
      const [card] = this.gameService.playerHand.splice(this.dragContext.index, 1);
      if (card) {
        if (!this.gameService.canAttackWith(card)) {
          this.gameService.playerHand.splice(this.dragContext.index, 0, card);
          this.gameService.statusMessage = 'Эту карту нельзя подкинуть по правилам.';
        } else {
          this.gameService.tableCards.splice(targetIndex + 1, 0, card);
          this.gameService.statusMessage = 'Карта добавлена к атаке.';
        }
      }
    } else if (this.dragContext.source === 'table') {
      const [card] = this.gameService.tableCards.splice(this.dragContext.index, 1);
      if (card) {
        this.gameService.tableCards.splice(targetIndex, 0, card);
        this.gameService.statusMessage = 'Порядок карт на столе изменён.';
      }
    }

    this.dragContext = null;
  }

  cardClass(card: string): string {
    if (card === '?') {
      return 'card-back';
    }

    if (card.includes('♠')) {
      return 'card-spades';
    }
    if (card.includes('♥')) {
      return 'card-hearts';
    }
    if (card.includes('♦')) {
      return 'card-diamonds';
    }
    if (card.includes('♣')) {
      return 'card-clubs';
    }

    return '';
  }
}
