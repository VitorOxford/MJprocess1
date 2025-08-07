<template>
  <v-card class="training-card" color="rgba(30,30,35,0.8)">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-school-outline</v-icon>
      Central de Treinamento
      <v-spacer></v-spacer>
      <v-progress-circular
        :model-value="completionPercentage"
        :rotate="360"
        :size="40"
        :width="4"
        color="primary"
      >
        <template v-slot:default>
          <span class="text-caption">{{ Math.round(completionPercentage) }}%</span>
        </template>
      </v-progress-circular>
    </v-card-title>
    <v-divider></v-divider>

    <v-card-text>
      <div class="mb-6">
        <h3 class="text-h6 font-weight-bold mb-3">{{ mainVideo.title }}</h3>
        <div class="video-player-wrapper">
          <video
            :key="mainVideo.url"
            :src="mainVideo.url"
            controls
            class="main-video-player"
            @ended="markAsCompleted(mainVideo.id)"
          ></video>
          <v-icon
            v-if="isCompleted(mainVideo.id)"
            class="check-overlay"
            color="success"
            size="x-large"
          >mdi-check-circle</v-icon>
        </div>
      </div>

      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="topic in videoTopics"
          :key="topic.id"
          class="topic-panel"
        >
          <v-expansion-panel-title class="font-weight-bold">
            <v-icon start :color="isTopicCompleted(topic) ? 'success' : 'primary'">{{ topic.icon }}</v-icon>
            {{ topic.title }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list class="bg-transparent" lines="two">
              <v-list-item class="video-list-item">
                <div class="video-container">
                  <div class="video-player-wrapper small">
                    <video
                      :key="topic.url"
                      :src="topic.url"
                      controls
                      @ended="markAsCompleted(topic.id)"
                    ></video>
                     <v-icon
                      v-if="isCompleted(topic.id)"
                      class="check-overlay small"
                      color="success"
                      size="large"
                    >mdi-check-circle</v-icon>
                  </div>
                  <div class="video-info">
                    <v-list-item-title class="font-weight-bold">{{ topic.title }}</v-list-item-title>
                    <v-list-item-subtitle>Lição principal do tópico.</v-list-item-subtitle>
                  </div>
                </div>
              </v-list-item>
              <v-list-item
                v-for="subvideo in topic.subvideos"
                :key="subvideo.id"
                class="video-list-item"
              >
                 <div class="video-container">
                  <div class="video-player-wrapper small">
                    <video
                      :key="subvideo.url"
                      :src="subvideo.url"
                      controls
                      @ended="markAsCompleted(subvideo.id)"
                    ></video>
                     <v-icon
                      v-if="isCompleted(subvideo.id)"
                      class="check-overlay small"
                      color="success"
                      size="large"
                    >mdi-check-circle</v-icon>
                  </div>
                  <div class="video-info">
                    <v-list-item-title>{{ subvideo.title }}</v-list-item-title>
                  </div>
                </div>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const mainVideo = {
  id: 'main-presentation',
  title: 'Apresentação Principal da Empresa',
  url: 'https://cdn.shopify.com/videos/c/o/v/3cad9212989d41a29eb30d4655d4f1bc.mp4',
};

const videoTopics = ref([
  {
    id: 'topic-1',
    title: 'Tipos de Tecido',
    icon: 'mdi-hanger',
    url: 'https://cdn.shopify.com/videos/c/o/v/14f0a2cc4cb14feb9624311779424997.mp4',
    subvideos: [
      {
        id: 'subtopic-1-1',
        title: 'Tipos de Poliéster e Viscose',
        url: 'https://cdn.shopify.com/videos/c/o/v/37fd779c56b0417d97e648f48eb7c0b1.mp4',
      },
    ],
  },
  {
    id: 'topic-2',
    title: 'O que é Ourela?',
    icon: 'mdi-vector-polyline',
    url: 'https://cdn.shopify.com/videos/c/o/v/6421e9733ba640b58e2728e5e0cd6f37.mp4',
    subvideos: [],
  },
  {
    id: 'topic-3',
    title: 'Impressão e Prazos',
    icon: 'mdi-printer-3d-nozzle-outline',
    url: 'https://cdn.shopify.com/videos/c/o/v/e2c3608e44bd4044a7a900bb27eacb56.mp4',
    subvideos: [],
  },
  {
    id: 'topic-4',
    title: 'Tipos de Serviços',
    icon: 'mdi-room-service-outline',
    url: 'https://cdn.shopify.com/videos/c/o/v/4c1c47e0216c4ecab1c7fa222fb5304a.mp4',
    subvideos: [],
  },
  {
    id: 'topic-5',
    title: 'Formas de Pagamento',
    icon: 'mdi-credit-card-outline',
    url: 'https://cdn.shopify.com/videos/c/o/v/647388af7c8d4a7b9ef6722b0b33ca56.mp4',
    subvideos: [],
  },
]);

const completedVideos = ref<Set<string>>(new Set());

const totalVideos = computed(() => {
  return 1 + videoTopics.value.reduce((acc, topic) => acc + 1 + topic.subvideos.length, 0);
});

const completionPercentage = computed(() => {
  if (totalVideos.value === 0) return 0;
  return (completedVideos.value.size / totalVideos.value) * 100;
});

const loadProgress = () => {
  const progress = localStorage.getItem('video-training-progress');
  if (progress) {
    completedVideos.value = new Set(JSON.parse(progress));
  }
};

const saveProgress = () => {
  localStorage.setItem('video-training-progress', JSON.stringify(Array.from(completedVideos.value)));
};

const markAsCompleted = (videoId: string) => {
  if (!completedVideos.value.has(videoId)) {
    completedVideos.value.add(videoId);
    saveProgress();
  }
};

const isCompleted = (videoId: string) => {
  return completedVideos.value.has(videoId);
};

const isTopicCompleted = (topic: any) => {
  const allTopicVideos = [topic, ...topic.subvideos];
  return allTopicVideos.every(video => isCompleted(video.id));
};

onMounted(() => {
  loadProgress();
});
</script>

<style scoped lang="scss">
.training-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.video-player-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  background-color: #000;

  &.small {
    width: 160px;
    height: 90px;
    flex-shrink: 0;
    margin-right: 16px;
  }
}

.main-video-player, video {
  width: 100%;
  display: block;
}

.check-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  padding: 8px;

  &.small {
    padding: 4px;
  }
}

.topic-panel {
  background-color: rgba(45, 45, 55, 0.7) !important;
  backdrop-filter: blur(10px);
  margin-bottom: 8px;
  border-radius: 8px !important;

  &:last-child {
    margin-bottom: 0;
  }
}

.video-list-item {
  padding-left: 0 !important;
  .video-container {
    display: flex;
    align-items: center;
    width: 100%;
  }
}
</style>
