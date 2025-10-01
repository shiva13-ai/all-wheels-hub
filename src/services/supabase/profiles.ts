import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: 'user' | 'mechanic' | 'admin';
  avatar_url: string | null;
  location: string | null;
  services_offered: string[] | null;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_available: boolean;
  udyam_registration_number: string | null;
  shop_photo_url: string | null;
  experience_years: number | null;
  created_at: string;
  updated_at: string;
};

export const profilesService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  async getMechanicsByService(service: string, location?: string) {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('is_available', true)
      .contains('services_offered', [service]);

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    return { data, error };
  },

  async getAllMechanics() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('is_available', true)
      .order('rating', { ascending: false });
    return { data, error };
  },
};