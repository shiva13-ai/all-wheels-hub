import { supabase } from "@/integrations/supabase/client";

export type OrderItem = {
    id: string;
    title: string;
    price: number;
    quantity: number;
};

export type CreateOrderData = {
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
};

export const ordersService = {
  async createOrder(orderData: CreateOrderData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        user_id: user.id,
      })
      .select()
      .single();

    return { data, error };
  },
};

