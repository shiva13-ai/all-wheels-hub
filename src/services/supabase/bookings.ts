import { supabase } from "@/integrations/supabase/client";

export type Booking = {
  id: string;
  user_id: string;
  mechanic_id: string | null;
  service_type: string;
  vehicle_type: 'bicycle' | 'bike' | 'car' | 'truck';
  description: string | null;
  location: string;
  scheduled_date: string | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateBookingData = {
  service_type: string;
  vehicle_type: 'bicycle' | 'bike' | 'car' | 'truck';
  description?: string;
  location: string;
  scheduled_date?: string;
  estimated_cost?: number;
  mechanic_id?: string;
};

export const bookingsService = {
  async createBooking(bookingData: CreateBookingData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        user_id: user.id,
      })
      .select()
      .single();
    return { data, error };
  },

  async getUserBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        mechanic:profiles!bookings_mechanic_id_fkey(full_name, phone, rating)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getMechanicBookings(mechanicId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(full_name, phone)
      `)
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async updateBookingStatus(bookingId: string, status: Booking['status']) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },

  async assignMechanic(bookingId: string, mechanicId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        mechanic_id: mechanicId,
        status: 'confirmed'
      })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },
};