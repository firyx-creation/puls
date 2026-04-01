import { supabase } from '@/lib/supabaseClient';

/**
 * Post Service
 */
export const postService = {
  async list(limit = 50) {
    const { data, error } = await supabase
      .from('Post')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async create(postData) {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('Post')
      .insert({
        ...postData,
        created_by: userData.user.email,
        is_published: false,
        created_date: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('Post')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('Post')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async filter(filterObj) {
    let query = supabase.from('Post').select('*');
    
    Object.entries(filterObj).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },
};

/**
 * UserPreference Service
 */
export const userPreferenceService = {
  async list(limit = 50) {
    const { data, error } = await supabase
      .from('UserPreference')
      .select('*')
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async create(prefData) {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('UserPreference')
      .insert({
        ...prefData,
        created_by: userData.user.email,
        created_date: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('UserPreference')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('UserPreference')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async filter(filterObj) {
    let query = supabase.from('UserPreference').select('*');
    
    Object.entries(filterObj).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },
};

/**
 * File Upload Service
 */
export const fileService = {
  async uploadFile(file, bucket = 'posts') {
    const fileName = `${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return {
      path: data.path,
      url: publicUrl.publicUrl,
    };
  },

  async deleteFile(filePath, bucket = 'posts') {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) throw error;
  },
};
