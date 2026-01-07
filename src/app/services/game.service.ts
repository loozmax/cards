import { Injectable } from '@angular/core';

export interface BotProfile {
  id: 'easy' | 'normal' | 'hard';
  label: string;
  description: string;
}

export interface BotMatchConfig {
  mode: 'throw-in' | 'transfer';
  bot: BotProfile;
}

export interface RoomMatchConfig {
  roomId: string;
  mode: 'throw-in' | 'transfer' | string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  private readonly suits = ['♠', '♥', '♦', '♣'];
  private deck: string[] = [];
  trumpSuit = '♠';

  playerHand: string[] = [];
  opponentHand: string[] = [];
  tableCards: string[] = [];
  statusMessage = '';
  botMatch: BotMatchConfig | null = null;
  roomMatch: RoomMatchConfig | null = null;

  configureBotMatch(config: BotMatchConfig) {
    this.botMatch = config;
  }

  setupRoomMatch(config: RoomMatchConfig) {
    this.roomMatch = config;
    this.startNewMatch();
  }

  startNewMatch() {
    this.deck = this.buildDeck();
    this.trumpSuit = this.deck[this.deck.length - 1]?.slice(-1) ?? '♠';
    this.playerHand = this.deck.splice(0, 6);
    this.opponentHand = this.deck.splice(0, 6);
    this.tableCards = [];
    this.statusMessage = 'Перетащите карту на стол, чтобы начать атаку.';
  }

  canAttackWith(card: string): boolean {
    if (!card || card === '?') {
      return false;
    }
    if (this.tableCards.length === 0) {
      return true;
    }
    const ranksOnTable = this.tableCards.map((tableCard) => this.cardRank(tableCard));
    return ranksOnTable.includes(this.cardRank(card));
  }

  private buildDeck(): string[] {
    const deck: string[] = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push(`${rank}${suit}`);
      }
    }
    return deck.sort(() => Math.random() - 0.5);
  }

  private cardRank(card: string): string {
    return card.replace(/[♠♥♦♣]/, '');
  }

  get remainingDeckCount(): number {
    return this.deck.length;
  }
}
