<template>
  <v-card
    class="dashboard-nav-card"
    @click="$emit('click')"
    variant="flat"
    @mousemove="onCardMouseMove"
  >
    <div class="card-glow"></div>
    <div class="card-border"></div>
    <v-card-text class="d-flex flex-column align-center justify-center text-center fill-height">
      <v-icon :icon="icon" :color="color" size="48" class="mb-4 card-icon"></v-icon>
      <h3 class="text-h6 font-weight-bold">{{ title }}</h3>
      <p class="text-body-2 text-medium-emphasis mt-1">{{ subtitle }}</p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}>();
defineEmits(['click']);

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};
</script>

<style scoped lang="scss">
.dashboard-nav-card {
  position: relative;
  background: rgba(30, 31, 49, 0.7);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  min-height: 200px;
  z-index: 1;

  .card-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
    z-index: 3;
  }

  .card-glow {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      rgba(255, 255, 255, 0.08),
      transparent 40%
    );
    opacity: 0;
    transition: opacity 0.4s;
    z-index: 2;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.3);
    border-color: rgba(var(--v-theme-primary), 0.5);

    .card-glow {
      opacity: 1;
    }

    .card-icon {
      transform: scale(1.1);
      filter: drop-shadow(0 0 10px currentColor);
    }
  }

  .card-icon {
    transition: all 0.3s ease;
  }
}
</style>
