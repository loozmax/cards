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
  playerHand = ['6♠', '7♠', '9♦', '10♣', 'A♥'];
  opponentHand = ['?', '?', '?', '?', '?', '?'];
  tableCards = ['8♠', '8♥'];
  botMatch: BotMatchConfig | null = null;
  roomMatch: RoomMatchConfig | null = null;

  configureBotMatch(config: BotMatchConfig) {
    this.botMatch = config;
  }

  setupRoomMatch(config: RoomMatchConfig) {
    this.roomMatch = config;
  }
}
