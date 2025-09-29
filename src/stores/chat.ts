import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', {
  state: () => ({
    totalUnreadCount: 0,
    notificationSound: null as HTMLAudioElement | null,
  }),
  actions: {
    setTotalUnreadCount(count: number) {
      this.totalUnreadCount = count;
    },
    initializeSound(element: HTMLAudioElement) {
      this.notificationSound = element;
    },
    playNotificationSound() {
      if (this.notificationSound) {
        this.notificationSound.currentTime = 0;
        this.notificationSound.play().catch(e => console.error("Audio playback failed:", e));
      }
    },
  },
});
