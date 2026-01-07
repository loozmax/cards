import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
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
}
