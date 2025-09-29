<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500px">
    <v-card class="glassmorphism-card">
        <v-tabs v-model="internalMode" fixed-tabs>
            <v-tab value="dm">Conversa Direta</v-tab>
            <v-tab value="group">Novo Grupo</v-tab>
        </v-tabs>
        <v-window v-model="internalMode">
            <v-window-item value="dm">
                <v-card-text class="pa-4">
                    <p class="text-caption text-grey mb-4">Selecione um usuário para iniciar uma conversa privada.</p>
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
            </v-window-item>
             <v-window-item value="group">
                <v-card-text class="pa-4">
                    <p class="text-caption text-grey mb-4">Dê um nome ao grupo e adicione os participantes.</p>
                    <v-text-field
                        v-model="groupName"
                        label="Nome do Grupo"
                        variant="outlined"
                        class="mb-4"
                    ></v-text-field>
                    <v-autocomplete
                        v-model="selectedGroupMembers"
                        :items="users"
                        item-title="full_name"
                        item-value="id"
                        label="Adicionar Membros"
                        variant="outlined"
                        multiple
                        chips
                        closable-chips
                    ></v-autocomplete>
                </v-card-text>
            </v-window-item>
        </v-window>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="submit" :disabled="isSubmitDisabled">
          {{ isGroupMode ? 'Criar Grupo' : 'Conversar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps<{ modelValue: boolean; mode: 'dm' | 'group' }>();
const emit = defineEmits(['update:modelValue', 'conversation-started', 'group-created']);

const internalMode = ref(props.mode);
const users = ref<any[]>([]);
const selectedUser = ref<any | null>(null);
const groupName = ref('');
const selectedGroupMembers = ref<string[]>([]);
const userStore = useUserStore();

const isGroupMode = computed(() => internalMode.value === 'group');

const isSubmitDisabled = computed(() => {
    if (isGroupMode.value) {
        return !groupName.value.trim() || selectedGroupMembers.value.length === 0;
    }
    return !selectedUser.value;
});

watch(() => props.mode, (newVal) => {
    internalMode.value = newVal;
});

watch(() => props.modelValue, (newVal) => {
    if(newVal) {
        internalMode.value = props.mode;
        selectedUser.value = null;
        groupName.value = '';
        selectedGroupMembers.value = [];
    }
});

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .neq('id', userStore.profile?.id);
  if (!error) users.value = data;
};

const startConversation = async () => {
  if (!selectedUser.value || !userStore.profile) return;
  const { data, error } = await supabase.rpc('find_or_create_dm_channel', {
    p_user1_id: userStore.profile.id,
    p_user2_id: selectedUser.value.id
  });
  if (error) console.error('Erro ao criar DM:', error);
  else emit('conversation-started', data);
};

const createGroup = async () => {
    alert('A criação de grupos ainda está em desenvolvimento.');
};

const submit = () => {
    if (isGroupMode.value) {
        createGroup();
    } else {
        startConversation();
    }
}

onMounted(fetchUsers);
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(40, 40, 45, 0.85);
  border-radius: 12px;
}
.dialog-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
