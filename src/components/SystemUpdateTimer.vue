<template>
  <div class="countdown-timer">
    <v-icon start small class="mr-1 blinking-icon">mdi-progress-clock</v-icon>
    <span>Atualização em: <strong>{{ formattedTime }}</strong></span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const props = defineProps<{
  endTime: number; // Timestamp de quando a contagem termina
}>();

const emit = defineEmits(['finished']);

const now = ref(new Date().getTime());
let intervalId: NodeJS.Timeout;

const remainingSeconds = computed(() => {
  const remaining = Math.round((props.endTime - now.value) / 1000);
  return remaining > 0 ? remaining : 0;
});

const formattedTime = computed(() => {
  if (remainingSeconds.value <= 0) {
    return '00:00';
  }
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = new Date().getTime();
    if (remainingSeconds.value <= 0) {
      clearInterval(intervalId);
      emit('finished');
    }
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(intervalId);
});
</script>

<style scoped lang="scss">
.countdown-timer {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(255, 171, 64, 0.9); // Cor de alerta (warning)
  color: #000;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 9999;
  display: flex;
  align-items: center;
  backdrop-filter: blur(5px);
}

.blinking-icon {
  animation: blink 1.5s infinite ease-in-out;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
</style>
