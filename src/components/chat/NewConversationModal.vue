<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500px">
    <v-card>
      <v-card-title>Iniciar Nova Conversa</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selectedUser"
          :items="users"
          item-title="full_name"
          item-value="id"
          label="Buscar usuário"
          variant="outlined"
          return-object
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" @click="startConversation" :disabled="!selectedUser">Conversar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue', 'conversation-started']);

const users = ref([]);
const selectedUser = ref(null);
const userStore = useUserStore();

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .neq('id', userStore.profile?.id); // Exclui o próprio usuário da lista
  if (!error) users.value = data;
};

const startConversation = async () => {
  if (!selectedUser.value || !userStore.profile) return;

  // A função RPC 'find_or_create_dm_channel' retorna o ID do canal
  const { data, error } = await supabase.rpc('find_or_create_dm_channel', {
    p_user1_id: userStore.profile.id,
    p_user2_id: selectedUser.value.id
  });

  if (error) {
    console.error('Erro ao criar DM:', error);
  } else {
    // --- CORREÇÃO APLICADA AQUI ---
    // Emitimos 'data', que é o ID numérico retornado pela função RPC.
    emit('conversation-started', data);
  }
};

onMounted(fetchUsers);
</script>
