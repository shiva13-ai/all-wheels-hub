import { supabase } from "@/integrations/supabase/client";

export type SOSRequest = {
  id: string;
  user_id: string;
  location: string;
  vehicle_type: 'bicycle' | 'bike' | 'car' | 'truck';
  issue_description: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
  assigned_mechanic_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSOSData = {
  location: string;
  vehicle_type: 'bicycle' | 'bike' | 'car' | 'truck';
  issue_description: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
};

export const sosService = {
  async createSOSRequest(sosData: CreateSOSData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('sos_requests')
      .insert({
        ...sosData,
        user_id: user.id,
      })
      .select()
      .single();
    return { data, error };
  },

  async getUserSOSRequests(userId: string) {
    const { data, error } = await supabase
      .from('sos_requests')
      .select(`
        *,
        assigned_mechanic:profiles!sos_requests_assigned_mechanic_id_fkey(full_name, phone, rating)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getOpenSOSRequests() {
    const { data, error } = await supabase
      .from('sos_requests')
      .select(`
        *,
        user:profiles!sos_requests_user_id_fkey(full_name, phone)
      `)
      .eq('status', 'open')
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async assignMechanic(sosId: string, mechanicId: string) {
    const { data, error } = await supabase
      .from('sos_requests')
      .update({ 
        assigned_mechanic_id: mechanicId,
        status: 'assigned'
      })
      .eq('id', sosId)
      .select()
      .single();
    return { data, error };
  },

  async updateSOSStatus(sosId: string, status: SOSRequest['status']) {
    const { data, error } = await supabase
      .from('sos_requests')
      .update({ status })
      .eq('id', sosId)
      .select()
      .single();
    return { data, error };
  },
};