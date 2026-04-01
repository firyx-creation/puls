import { supabase } from '@/lib/supabaseClient';

/**
 * Admin Service - Gère les rôles d'administrateur
 */
export const adminService = {
  async checkIsAdmin(email) {
    try {
      // Vérifier si l'utilisateur a le rôle admin dans UserPreference
      const { data, error } = await supabase
        .from('UserPreference')
        .select('role')
        .eq('created_by', email)
        .single();
      
      if (error) {
        console.warn('No preference found for user');
        return false;
      }
      
      return data?.role === 'admin';
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  },

  async setAdmin(email, isAdmin) {
    try {
      const { data, error } = await supabase
        .from('UserPreference')
        .update({ role: isAdmin ? 'admin' : 'user' })
        .eq('created_by', email)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to set admin status:', error);
      throw error;
    }
  },

  async getAllAdmins() {
    try {
      const { data, error } = await supabase
        .from('UserPreference')
        .select('created_by, pseudo')
        .eq('role', 'admin');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      return [];
    }
  },
};
