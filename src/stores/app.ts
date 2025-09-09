import { defineStore } from 'pinia';

export type LowStockAlert = {
  id: number;
  fabricName: string;
  remainingStock: number;
};

// Guarda o timestamp do último alerta para cada tecido (evita spam)
const lastAlertTimestamps: Record<string, number> = {};
const ALERT_COOLDOWN = 30 * 60 * 1000; // 30 minutos em milissegundos

export const useAppStore = defineStore('app', {
  state: () => ({
    lowStockAlerts: [] as LowStockAlert[],
  }),
  actions: {
    triggerLowStockAlert(fabricName: string, remainingStock: number) {
      const now = Date.now();
      const lastAlert = lastAlertTimestamps[fabricName];

      // Se não houver alerta anterior ou se o cooldown já passou
      if (!lastAlert || (now - lastAlert > ALERT_COOLDOWN)) {
        console.log(`Disparando alerta para ${fabricName}.`);
        this.lowStockAlerts.push({
          id: now,
          fabricName,
          remainingStock,
        });
        // Atualiza o timestamp do último alerta para este tecido
        lastAlertTimestamps[fabricName] = now;

        // Atualiza o timestamp no banco de dados também
        this.updateLastAlertedTimestamp(fabricName);
      } else {
        console.log(`Alerta para ${fabricName} está em cooldown. Ignorando.`);
      }
    },
    async updateLastAlertedTimestamp(fabricName: string) {
        // Esta é uma operação "fire-and-forget", não precisamos esperar
        // Apenas para registrar no banco e persistir o cooldown entre sessões
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
  },
});
