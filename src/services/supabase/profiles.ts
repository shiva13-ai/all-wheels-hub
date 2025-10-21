import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: 'user' | 'mechanic' | 'admin';
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null; // ADDED
  guardian_phone: string | null; // ADDED
  avatar_url: string | null;
  location: string | null;
  latitude: number | null; // Added from database types
  longitude: number | null; // Added from database types
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
    // We cast to UserProfile after fetching as the Supabase library often returns generic row types
    return { data: data as UserProfile, error };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    // Ensure we only send fields that exist in the database schema
    const cleanUpdates: Partial<typeof updates> = {
        full_name: updates.full_name,
        phone: updates.phone,
        gender: updates.gender,
        guardian_phone: updates.guardian_phone,
        role: updates.role,
        location: updates.location,
        latitude: updates.latitude,
        longitude: updates.longitude,
        experience_years: updates.experience_years,
        services_offered: updates.services_offered,
        is_available: updates.is_available,
        udyam_registration_number: updates.udyam_registration_number,
        shop_photo_url: updates.shop_photo_url,
        is_verified: updates.is_verified,
        // Exclude properties managed automatically or derived (id, user_id, rating, etc.)
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(cleanUpdates)
      .eq('user_id', userId)
      .select()
      .single();
    
    return { data: data as UserProfile, error };
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
    return { data: data as UserProfile[], error };
  },

  async getAllMechanics() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mechanic')
      .eq('is_available', true)
      .order('rating', { ascending: false });
    return { data: data as UserProfile[], error };
  },
};
