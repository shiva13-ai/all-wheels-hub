import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Type definition for a product based on the database schema
export type Product = Tables<'products'> & {
    price: number; // Stored in major units (e.g., Rupees, Dollars) for frontend display
};

// Internal type for data fetched directly from the DB (price is in minor units: cents/paise)
type DbProduct = Tables<'products'>;

export const storeService = {
  /**
   * Fetches all active products available to customers.
   * Joins with profiles to get mechanic name/info if needed.
   */
  async getActiveProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        mechanic:profiles!products_mechanic_id_fkey(full_name, rating, total_reviews)
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Error fetching active products:", error);
      return { data: null, error: error };
    }

    // Convert price from minor unit (paise/cents) to major unit (rupees/dollars) for display
    const convertedData: Product[] = (data || []).map((p: DbProduct & { mechanic: any }) => ({
        ...p,
        price: (p.price || 0) / 100, // Convert to major unit
    }));

    return { data: convertedData, error: null };
  },

  /**
   * Fetches products for a specific mechanic (used in MechanicStore dashboard).
   * Note: This function is essentially defined in MechanicStore.tsx now, but kept here for completeness.
   * If the function implementation remains in MechanicStore.tsx, you can remove this placeholder.
   */
  async getMechanicProducts(mechanicId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Supabase Error fetching products for mechanic ${mechanicId}:`, error);
      return { data: null, error: error };
    }

    // Convert price from minor unit (paise/cents) to major unit (rupees/dollars) for display
    const convertedData: Product[] = (data || []).map((p: DbProduct) => ({
        ...p,
        price: (p.price || 0) / 100, // Convert to major unit
    }));

    return { data: convertedData, error: null };
  },
  
  // Placeholder for other store-related actions (e.g., delete, update)
  async deleteProduct(productId: string) {
      const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
      return { error };
  }
};
