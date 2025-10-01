<template>
  <v-dialog :model-value="show" max-width="500px" persistent @update:model-value="$emit('close')">
    <v-card class="glassmorphism-card">
      <v-card-title class="dialog-header">
        <span class="text-h5">Definir Meta para {{ sellerName }}</span>
      </v-card-title>
      <v-card-text class="py-4">
        <v-row>
          <v-col cols="6">
            <v-select v-model="month" :items="months" label="Mês" variant="outlined"></v-select>
          </v-col>
          <v-col cols="6">
            <v-text-field v-model.number="year" label="Ano" variant="outlined" readonly></v-text-field>
          </v-col>
        </v-row>
        <v-text-field v-model.number="goalValue" label="Valor da Meta" type="number" prefix="R$" variant="outlined"></v-text-field>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="saveGoal" :loading="isSaving">Salvar Meta</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { supabase } from '@/api/supabase';

const props = defineProps({ show: Boolean, sellerId: String, sellerName: String });
const emit = defineEmits(['close', 'saved']);

const isSaving = ref(false);
const month = ref(new Date().getMonth() + 1);
const year = ref(new Date().getFullYear());
const goalValue = ref(0);
const months = Array.from({ length: 12 }, (_, i) => ({ title: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }), value: i + 1 }));

watch(() => props.show, async (newVal) => {
  if (newVal && props.sellerId) {
    const { data } = await supabase.from('sales_goals')
      .select('goal_value')
      .eq('seller_id', props.sellerId)
      .eq('month', month.value)
      .eq('year', year.value)
      .single();
    goalValue.value = data?.goal_value || 0;
  }
});

const saveGoal = async () => {
  isSaving.value = true;
  try {
    const { error } = await supabase.from('sales_goals').upsert({
      seller_id: props.sellerId,
      month: month.value,
      year: year.value,
      goal_value: goalValue.value
    }, { onConflict: 'seller_id, month, year' });
    if (error) throw error;
    emit('saved');
  } catch (err) {
    console.error(err);
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.glassmorphism-card { backdrop-filter: blur(15px); background-color: rgba(35, 35, 40, 0.85); border-radius: 12px; }
.dialog-header, .dialog-footer { border-color: rgba(255, 255, 255, 0.1) !important; padding: 16px; }
.dialog-header { border-bottom: 1px solid; }
.dialog-footer { border-top: 1px solid; }
</style>
