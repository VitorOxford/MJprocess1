<template>
  <v-container fluid>
    <v-toolbar color="transparent">
      <v-toolbar-title class="font-weight-bold">Gerenciamento de Usuários</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="primary" variant="flat" @click="openDialog()" class="add-user-btn">
        <v-icon start>mdi-account-plus-outline</v-icon>
        Novo Usuário
      </v-btn>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16"><v-progress-circular indeterminate color="primary" size="64"></v-progress-circular></div>
    <div v-else>
      <div v-for="group in userGroups" :key="group.role" class="mb-10">
        <div class="d-flex align-center mb-5">
          <div class="role-title-line" :style="{ '--glow-color': group.color }"></div>
          <h2 class="text-h5 font-weight-bold mx-4 role-title" :style="{ color: group.color }">{{ group.title }}</h2>
          <div class="role-title-line" :style="{ '--glow-color': group.color }"></div>
        </div>
        <v-row>
          <v-col v-for="(profile, index) in group.users" :key="profile.id" cols="12" sm="6" md="4" lg="3">
            <div class="user-card-container" :style="{'--animation-delay': `${index * 0.05}s`}">
              <v-card class="user-card" variant="flat" @mousemove="onCardMouseMove">
                <div class="card-glow"></div>
                <div class="card-border"></div>
                <v-menu v-if="profile.id !== userStore.profile?.id" location="start">
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small" class="card-menu-btn"></v-btn>
                  </template>
                  <v-list density="compact" class="menu-list-styling">
                    <v-list-item @click="openDialog(profile)" prepend-icon="mdi-pencil-outline"><v-list-item-title>Editar</v-list-item-title></v-list-item>
                    <v-list-item @click="openDeleteDialog(profile)" prepend-icon="mdi-delete-outline" base-color="error"><v-list-item-title>Excluir</v-list-item-title></v-list-item>
                  </v-list>
                </v-menu>
                <v-card-text class="d-flex flex-column align-center text-center pa-6">
                  <v-avatar :image="profile.avatar_url || undefined" size="80" class="mb-4 elevation-4 avatar-glow"></v-avatar>
                  <p class="font-weight-bold text-h6">{{ profile.full_name }}</p>
                  <p class="text-body-2 text-medium-emphasis">{{ profile.email }}</p>
                  <div v-if="profile.role === 'vendedor' || profile.role === 'admin'" class="mt-4">
                    <span class="text-caption text-grey">Regiões:</span>
                    <div class="d-flex justify-center ga-1 mt-1">
                      <v-chip v-for="region in profile.allowed_regions" :key="region" size="x-small" variant="tonal" color="white">{{ region }}</v-chip>
                      <span v-if="!profile.allowed_regions || !profile.allowed_regions.length" class="text-caption text-disabled">Nenhuma</span>
                    </div>
                  </div>
                </v-card-text>
                <v-card-actions class="card-actions">
                  <v-chip v-if="profile.id === userStore.profile?.id" color="primary" variant="flat" label block>
                    <v-icon start>mdi-account-check-outline</v-icon>
                    Este é você
                  </v-chip>
                </v-card-actions>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </div>
    </div>

    <v-dialog v-model="editDialog" max-width="500px" persistent><v-form @submit.prevent="saveItem">
      <v-card class="glassmorphism-card">
        <v-card-title class="dialog-header"><span class="text-h5">{{ formTitle }}</span></v-card-title>
        <v-card-text class="py-4">
          <div class="d-flex justify-center mb-4"><v-avatar :image="avatarPreview || editedItem.avatar_url || undefined" size="100" class="avatar-preview">
            <v-icon v-if="!avatarPreview && !editedItem.avatar_url" size="50">mdi-account-circle</v-icon>
          </v-avatar></div>
          <v-file-input v-model="avatarFile" label="Foto de Perfil" accept="image/*" variant="outlined" prepend-icon="mdi-camera" density="compact" class="mb-4" @change="onFileChange"></v-file-input>
          <v-text-field v-if="!isEditing" v-model="editedItem.full_name" label="Nome Completo" variant="outlined" class="mb-4"></v-text-field>
          <p v-else class="mb-4"><strong>Usuário:</strong> {{ editedItem.full_name }}</p>
          <v-text-field v-if="!isEditing" v-model="editedItem.email" label="E-mail" type="email" variant="outlined" class="mb-4"></v-text-field>
          <v-text-field v-if="!isEditing" v-model="editedItem.password" label="Senha" type="password" variant="outlined" class="mb-4"></v-text-field>
          <v-select v-model="editedItem.role" :items="['admin', 'vendedor', 'designer', 'producao']" label="Cargo (Role)" variant="outlined"></v-select>
          <v-select v-if="editedItem.role === 'vendedor' || editedItem.role === 'admin'" v-model="editedItem.allowed_regions" :items="['SE', 'NE']" label="Regiões de Preço" variant="outlined" multiple chips closable-chips class="mt-4" hint="Selecione as regiões" persistent-hint></v-select>
        </v-card-text>
        <v-card-actions class="dialog-footer">
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="isSaving">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-form></v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px" persistent><v-card class="glassmorphism-card">
        <v-card-title class="d-flex align-center"><v-icon color="error" start>mdi-alert-circle-outline</v-icon>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir o usuário <strong>{{ itemToDelete.full_name }}</strong>? Esta ação não pode ser desfeita.</v-card-text>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="closeDeleteDialog">Cancelar</v-btn>
            <v-btn color="error" variant="flat" @click="deleteUserConfirm" :loading="isDeleting">Excluir</v-btn>
        </v-card-actions>
    </v-card></v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import type { Profile } from '@/types';

type ProfileWithEmail = Profile & { email?: string; password?: string };

const userStore = useUserStore();
const profiles = ref<ProfileWithEmail[]>([]);
const loading = ref(true);
const isSaving = ref(false);
const isEditing = ref(false);
const isDeleting = ref(false);
const avatarFile = ref<File[]>([]);
const avatarPreview = ref<string | null>(null);

const snackbar = reactive({ show: false, text: '', color: '' });
const editDialog = ref(false);
const deleteDialog = ref(false);

const defaultItem: ProfileWithEmail = { id: '', full_name: '', email: '', password: '', role: 'vendedor', allowed_regions: [], avatar_url: '' };
const editedItem = ref<ProfileWithEmail>({ ...defaultItem });
const itemToDelete = ref<Partial<ProfileWithEmail>>({});

const formTitle = computed(() => isEditing.value ? 'Editar Permissões' : 'Criar Novo Usuário');
const userGroups = computed(() => {
  const groups: Record<string, { role: string; title: string; color: string; users: ProfileWithEmail[]; order: number }> = {
    admin: { role: 'admin', title: 'Admins', color: '#F44336', users: [], order: 1 },
    designer: { role: 'designer', title: 'Designers', color: '#2196F3', users: [], order: 2 },
    vendedor: { role: 'vendedor', title: 'Vendedores', color: '#4CAF50', users: [], order: 3 },
    producao: { role: 'producao', title: 'Produção', color: '#FF9800', users: [], order: 4 },
  };
  profiles.value.forEach(p => groups[p.role]?.users.push(p));
  return Object.values(groups).sort((a, b) => a.order - b.order);
});

const showSnackbar = (text: string, color: string) => { snackbar.text = text; snackbar.color = color; snackbar.show = true; };

const fetchProfiles = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('profiles_with_email').select('*').order('full_name');
    if (error) throw error;
    profiles.value = data as ProfileWithEmail[];
  } catch (err: any) { showSnackbar(`Erro ao buscar perfis: ${err.message}`, 'error'); }
  finally { loading.value = false; }
};

const onFileChange = () => {
  if (avatarFile.value.length > 0) {
    const reader = new FileReader();
    reader.onload = (e) => { avatarPreview.value = e.target?.result as string; };
    reader.readAsDataURL(avatarFile.value[0]);
  } else { avatarPreview.value = null; }
};

const openDialog = (item: ProfileWithEmail | null = null) => {
  avatarFile.value = [];
  avatarPreview.value = null;
  if (item) {
    isEditing.value = true;
    editedItem.value = JSON.parse(JSON.stringify(item)); // Deep copy to avoid reactivity issues
  } else {
    isEditing.value = false;
    editedItem.value = { ...defaultItem };
  }
  editDialog.value = true;
};

const closeDialog = () => { editDialog.value = false; };

const openDeleteDialog = (item: ProfileWithEmail) => {
    itemToDelete.value = item;
    deleteDialog.value = true;
};

const closeDeleteDialog = () => {
    deleteDialog.value = false;
    itemToDelete.value = {};
};

const handleAvatarUpload = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  if (updateError) throw updateError;
  return publicUrl;
};

const saveItem = async () => {
  isSaving.value = true;
  try {
    let userId = editedItem.value.id;
    let newAvatarUrl = editedItem.value.avatar_url;
    let successMessage = 'Usuário atualizado com sucesso!';

    if (!isEditing.value) { // Lógica de CRIAÇÃO
      const { email, password, full_name, role, allowed_regions } = editedItem.value;
      const { data, error } = await supabase.functions.invoke('create-user', { body: { email, password, full_name, role, allowed_regions } });
      if (error || data.error) throw new Error(error?.message || data.error);
      userId = data.id;
      successMessage = data.message || 'Usuário criado com sucesso!';
    } else { // Lógica de EDIÇÃO
      const { id, role, allowed_regions } = editedItem.value;
      const { error } = await supabase.from('profiles').update({ role, allowed_regions: (role === 'vendedor' || role === 'admin') ? allowed_regions : [] }).eq('id', id);
      if (error) throw error;
    }

    if (avatarFile.value.length > 0 && userId) {
      newAvatarUrl = await handleAvatarUpload(userId, avatarFile.value[0]);
    }

    const profileIndex = profiles.value.findIndex(p => p.id === userId);
    if (profileIndex !== -1) { // Atualiza o perfil na lista local
      profiles.value[profileIndex] = { ...profiles.value[profileIndex], ...editedItem.value, avatar_url: newAvatarUrl };
    } else { // Se for um novo usuário, busca a lista toda
      await fetchProfiles();
    }

    showSnackbar(successMessage, 'success');
    closeDialog();
  } catch (err: any) { showSnackbar(`Erro ao salvar: ${err.message}`, 'error'); }
  finally { isSaving.value = false; }
};

const deleteUserConfirm = async () => {
    isDeleting.value = true;
    try {
        const { error } = await supabase.functions.invoke('delete-user', { body: { id: itemToDelete.value.id } });
        if (error) throw error;
        profiles.value = profiles.value.filter(p => p.id !== itemToDelete.value.id);
        showSnackbar('Usuário excluído com sucesso!', 'success');
        closeDeleteDialog();
    } catch (err: any) {
        showSnackbar(`Erro ao excluir: ${err.message}`, 'error');
    } finally {
        isDeleting.value = false;
    }
};

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
};

onMounted(fetchProfiles);
</script>

<style scoped lang="scss">
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px -5px var(--glow-color); }
  50% { box-shadow: 0 0 35px 5px var(--glow-color); }
}
@keyframes card-entry {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.add-user-btn { font-weight: bold; }
.role-title-line { flex-grow: 1; height: 2px; background: linear-gradient(90deg, transparent, var(--glow-color), transparent); animation: pulse-glow 3s infinite ease-in-out; }
.role-title { text-shadow: 0 0 10px var(--glow-color); }
.user-card-container { animation: card-entry 0.5s ease-out backwards; animation-delay: var(--animation-delay); }
.user-card {
  position: relative; background: rgba(30, 31, 49, 0.7);
  border-radius: 16px; overflow: hidden;
  transition: all 0.3s ease; height: 100%; min-height: 290px;
  z-index: 1; display: flex; flex-direction: column;

  .card-menu-btn { position: absolute; top: 8px; right: 8px; z-index: 4; }
  .card-border { position: absolute; inset: 0; border-radius: inherit; border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; z-index: 3; transition: border-color 0.3s ease; }
  .card-glow { position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.1), transparent 40%); opacity: 0; transition: opacity 0.4s; z-index: 2; }
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.4);
    .card-border { border-color: rgba(var(--v-theme-primary), 0.5); }
    .card-glow { opacity: 1; }
    .avatar-glow { box-shadow: 0 0 25px 3px rgba(var(--v-theme-primary-rgb), 0.7); }
  }
}
.avatar-glow { border: 2px solid rgba(var(--v-theme-primary-rgb), 0.8); transition: box-shadow 0.3s ease; }
.avatar-preview { border: 3px solid rgba(255, 255, 255, 0.2); }
.v-card-text { flex-grow: 1; }
.card-actions { padding: 0 16px 16px 16px; min-height: 52px; display: flex; align-items: center; }
.glassmorphism-card { backdrop-filter: blur(15px); background-color: rgba(35, 35, 40, 0.85); border-radius: 12px; }
.dialog-header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
.menu-list-styling { background-color: rgba(45, 45, 50, 0.9) !important; backdrop-filter: blur(10px); }
</style>
