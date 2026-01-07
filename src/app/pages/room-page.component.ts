import { Component, OnInit } from '@angular/core';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'app-room-page',
  templateUrl: './room-page.component.html'
})
export class RoomPageComponent implements OnInit {
  mode = 'throw-in';
  roomLink = '';
  joinCode = '';
  statusMessage = '';
  bluetoothAvailable = false;
  bluetoothStatus = '';

  constructor(private roomService: RoomService) {}

  ngOnInit() {
    this.bluetoothAvailable = this.roomService.isBluetoothAvailable();
  }

  createRoom() {
    this.roomLink = this.roomService.createRoomLink(this.mode);
    this.statusMessage = 'Комната создана. Поделитесь ссылкой с другом.';
  }

  async copyLink() {
    if (!this.roomLink) {
      return;
    }

    const copied = await this.roomService.copyToClipboard(this.roomLink);
    this.statusMessage = copied ? 'Ссылка скопирована.' : 'Не удалось скопировать ссылку.';
  }

  joinRoom() {
    if (!this.joinCode.trim()) {
      this.statusMessage = 'Введите ссылку или код комнаты.';
      return;
    }

    const target = this.roomService.resolveRoomLink(this.joinCode);
    if (!target) {
      this.statusMessage = 'Некорректный код комнаты.';
      return;
    }

    this.statusMessage = `Подключение к комнате ${target.roomId}...`;
  }

  async startBluetoothMatch() {
    await this.roomService.startBluetoothMatch();
    this.bluetoothStatus = this.roomService.bluetoothStatus;
  }
}
