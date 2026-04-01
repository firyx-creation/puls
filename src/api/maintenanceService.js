import { supabase } from '@/lib/supabaseClient';

/**
 * Maintenance Service - Non-sécurisé mais simple
 * Stocke l'état de maintenance dans localStorage + Supabase
 */
export const maintenanceService = {
  // Cache local pour éviter trop de requêtes
  _cache: null,
  _cacheTime: 0,

  async getStatus() {
    // Cache pendant 30 secondes
    const now = Date.now();
    if (this._cache && now - this._cacheTime < 30000) {
      return this._cache;
    }

    try {
      // Essayer de récupérer depuis Supabase (dans une table settings)
      const { data, error } = await supabase
        .from('SystemSettings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const status = data ? {
        enabled: data.enabled || false,
        message: data.message || 'Maintenance en cours. Reviens plus tard!',
        endTime: data.end_time || null,
      } : {
        enabled: false,
        message: 'Maintenance en cours. Reviens plus tard!',
        endTime: null,
      };

      this._cache = status;
      this._cacheTime = now;
      return status;
    } catch (error) {
      console.error('Failed to get maintenance status:', error);
      return {
        enabled: false,
        message: 'Maintenance en cours. Reviens plus tard!',
        endTime: null,
      };
    }
  },

  async setStatus(enabled, message = 'Maintenance en cours. Reviens plus tard!', endTime = null) {
    try {
      // Vérifier si la ligne existe déjà
      const { data: existing } = await supabase
        .from('SystemSettings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .single();

      if (existing) {
        // Mise à jour
        await supabase
          .from('SystemSettings')
          .update({
            enabled,
            message,
            end_time: endTime,
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'maintenance_mode');
      } else {
        // Création
        await supabase
          .from('SystemSettings')
          .insert({
            key: 'maintenance_mode',
            enabled,
            message,
            end_time: endTime,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      // Invalider le cache
      this._cache = null;
      this._cacheTime = 0;

      return { enabled, message, endTime };
    } catch (error) {
      console.error('Failed to set maintenance status:', error);
      throw error;
    }
  },
};
