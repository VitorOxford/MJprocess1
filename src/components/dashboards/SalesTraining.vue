<template>
  <v-card class="training-card" color="rgba(30,30,35,0.8)">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-school-outline</v-icon>
      Central de Treinamento
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <span class="text-caption mr-2">Progresso</span>
        <v-progress-circular
          :model-value="completionPercentage"
          :size="32"
          :width="3"
          color="primary"
        >
          <span class="text-caption">{{ Math.round(completionPercentage) }}%</span>
        </v-progress-circular>
      </div>
    </v-card-title>
    <v-divider></v-divider>

    <v-row no-gutters class="fill-height">
      <v-col cols="12" md="8" class="video-panel pa-4">
        <div class="video-player-wrapper">
          <video
            :key="activeVideo.url"
            :src="activeVideo.url"
            controls
            controlslist="nodownload"
            class="main-video-player"
            @ended="markAsCompleted(activeVideo.id)"
          ></video>
        </div>
        <h3 class="text-h6 font-weight-bold mt-4">{{ activeVideo.title }}</h3>
      </v-col>

      <v-col cols="12" md="4" class="playlist-panel">
        <v-list class="bg-transparent" nav>
          <v-list-item
            v-for="video in allVideos"
            :key="video.id"
            @click="playVideo(video)"
            :active="activeVideo.id === video.id"
            class="video-list-item"
            :prepend-icon="video.icon"
          >
            <v-list-item-title :class="{'sub-item': video.isSubtopic}">{{ video.title }}</v-list-item-title>
            <template v-slot:append>
              <v-icon v-if="isCompleted(video.id)" color="success">mdi-check-circle</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';

type Video = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isSubtopic?: boolean;
};

const allVideos = reactive<Video[]>([]);
const activeVideo = ref<Video>({ id: '', title: '', url: '' });
const completedVideos = ref<Set<string>>(new Set());

const completionPercentage = computed(() => {
  if (allVideos.length === 0) return 0;
  return (completedVideos.value.size / allVideos.length) * 100;
});

const initializeVideos = () => {
  const mainVideo = {
    id: 'main-presentation',
    title: 'Apresentação Principal',
    url: 'https://cdn.shopify.com/videos/c/o/v/3cad9212989d41a29eb30d4655d4f1bc.mp4',
    icon: 'mdi-play-circle-outline'
  };

  const topics: any[] = [
    { id: 'topic-1', title: 'Tipos de Tecido', icon: 'mdi-hanger', url: 'https://cdn.shopify.com/videos/c/o/v/14f0a2cc4cb14feb9624311779424997.mp4', subvideos: [{ id: 'subtopic-1-1', title: 'Poliéster e Viscose', url: 'https://cdn.shopify.com/videos/c/o/v/37fd779c56b0417d97e648f48eb7c0b1.mp4' }] },
    { id: 'topic-2', title: 'O que é Ourela?', icon: 'mdi-vector-polyline', url: 'https://cdn.shopify.com/videos/c/o/v/6421e9733ba640b58e2728e5e0cd6f37.mp4', subvideos: [] },
    { id: 'topic-3', title: 'Impressão e Prazos', icon: 'mdi-printer-3d-nozzle-outline', url: 'https://cdn.shopify.com/videos/c/o/v/e2c3608e44bd4044a7a900bb27eacb56.mp4', subvideos: [] },
    { id: 'topic-4', title: 'Tipos de Serviços', icon: 'mdi-room-service-outline', url: 'https://cdn.shopify.com/videos/c/o/v/4c1c47e0216c4ecab1c7fa222fb5304a.mp4', subvideos: [] },
    { id: 'topic-5', title: 'Formas de Pagamento', icon: 'mdi-credit-card-outline', url: 'https://cdn.shopify.com/videos/c/o/v/647388af7c8d4a7b9ef6722b0b33ca56.mp4', subvideos: [] },
  ];

  const videoList: Video[] = [mainVideo];
  topics.forEach(topic => {
    videoList.push({ id: topic.id, title: topic.title, url: topic.url, icon: topic.icon });
    topic.subvideos.forEach((sub: any) => {
      videoList.push({ id: sub.id, title: sub.title, url: sub.url, icon: 'mdi-circle-small', isSubtopic: true });
    });
  });

  allVideos.splice(0, allVideos.length, ...videoList);
  if (allVideos.length > 0) {
    activeVideo.value = allVideos[0];
  }
};

const playVideo = (video: Video) => {
  activeVideo.value = video;
};

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

const isCompleted = (videoId: string) => completedVideos.value.has(videoId);

onMounted(() => {
  initializeVideos();
  loadProgress();
});
</script>

<style scoped lang="scss">
.training-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  min-height: 500px;
}

.video-panel {
  display: flex;
  flex-direction: column;
}

.video-player-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  background-color: #000;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-video-player {
  width: 100%;
  max-height: 100%;
}

.playlist-panel {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  height: 500px; // Altura fixa para a playlist
  overflow-y: auto;

  @media (max-width: 960px) {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    height: auto; // Altura automática em mobile
    max-height: 300px; // Limita a altura em mobile
  }
}

.video-list-item {
  border-radius: 8px;
  margin: 4px 8px;
  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.2);
  }
  & .sub-item {
    padding-left: 16px;
    font-size: 0.9rem;
  }
}
</style>
