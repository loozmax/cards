import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  bluetoothStatus = 'Bluetooth: не подключено';

  createRoomLink(mode: string): string {
    const roomId = this.generateRoomId();
    const baseUrl = window?.location?.origin ?? 'https://cards.local';
    return `${baseUrl}/game?mode=${mode}&room=${roomId}`;
  }

  resolveRoomLink(value: string): { roomId: string; mode?: string } | null {
    try {
      const url = value.includes('http') ? new URL(value) : null;
      if (url) {
        return {
          roomId: url.searchParams.get('room') ?? '',
          mode: url.searchParams.get('mode') ?? undefined
        };
      }

      const sanitized = value.trim();
      if (!sanitized) {
        return null;
      }

      return { roomId: sanitized };
    } catch {
      return null;
    }
  }

  async copyToClipboard(text: string): Promise<boolean> {
    if (!navigator?.clipboard) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  isBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async startBluetoothMatch(): Promise<void> {
    if (!this.isBluetoothAvailable()) {
      this.bluetoothStatus = 'Bluetooth не поддерживается на этом устройстве.';
      return;
    }

    try {
      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true
      });
      this.bluetoothStatus = `Подключено к устройству: ${device.name ?? 'Без имени'}`;
    } catch {
      this.bluetoothStatus = 'Не удалось подключиться по Bluetooth.';
    }
  }
}
