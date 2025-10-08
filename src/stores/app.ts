import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

export type LowStockAlert = {
  id: number;
  fabricName: string;
  remainingStock: number;
};

// Objeto para o Snackbar
export interface SnackbarState {
  show: boolean;
  text: string;
  color: 'success' | 'error' | 'info' | 'warning';
  timeout: number;
}

const lastAlertTimestamps: Record<string, number> = {};
const ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hora em milissegundos

export const useAppStore = defineStore('app', {
  state: () => ({
    lowStockAlerts: [] as LowStockAlert[],
    // Adiciona o estado do snackbar
    snackbar: {
      show: false,
      text: '',
      color: 'info',
      timeout: 4000,
    } as SnackbarState,
  }),
  actions: {
    // A AÇÃO QUE ESTAVA FALTANDO
    showSnackbar(text: string, color: SnackbarState['color'] = 'info', timeout = 4000) {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.timeout = timeout;
      this.snackbar.show = true;
    },

    triggerLowStockAlert(fabricName: string, remainingStock: number) {
      const now = Date.now();
      const lastAlert = lastAlertTimestamps[fabricName];

      if (!lastAlert || (now - lastAlert > ALERT_COOLDOWN)) {
        console.log(`Disparando alerta para ${fabricName}.`);
        this.lowStockAlerts.push({
          id: now,
          fabricName,
          remainingStock,
        });
        lastAlertTimestamps[fabricName] = now;
        this.updateLastAlertedTimestamp(fabricName);
      } else {
        console.log(`Alerta para ${fabricName} está em cooldown. Ignorando.`);
      }
    },
    async updateLastAlertedTimestamp(fabricName: string) {
      const { error } = await supabase
        .from('stock')
        .update({ last_alerted_at: new Date().toISOString() })
        .eq('fabric_type', fabricName);

      if (error) {
        console.error("Falha ao atualizar o timestamp do alerta no banco:", error);
      }
    },
    dismissAlert(alertId: number) {
      this.lowStockAlerts = this.lowStockAlerts.filter(alert => alert.id !== alertId);
    },
    async checkInitialLowStock() {
      try {
        const { data, error } = await supabase.rpc('get_low_stock_items');

        if (error) throw error;

        const oneHourAgo = new Date(Date.now() - ALERT_COOLDOWN);

        for (const item of data) {
          if (!item.last_alerted_at || new Date(item.last_alerted_at) < oneHourAgo) {
            this.triggerLowStockAlert(item.fabric_type, item.available_meters);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar estoque inicial baixo:", err);
      }
    }
  },
});
