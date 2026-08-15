/**
 * Tipos de la base — espejo de supabase/migrations/20260815000000_init.sql.
 * Se pueden regenerar con:
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          currency?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon_key: string;
          color_index: number;
          sort_order: number;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon_key?: string;
          color_index?: number;
          sort_order?: number;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon_key?: string;
          color_index?: number;
          sort_order?: number;
          archived?: boolean;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          occurred_on: string;
          /** Negativo = gasto, positivo = ingreso. */
          amount: number;
          category_id: string | null;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          occurred_on?: string;
          amount: number;
          category_id?: string | null;
          description?: string;
          created_at?: string;
        };
        Update: {
          occurred_on?: string;
          amount?: number;
          category_id?: string | null;
          description?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      monthly_totals: {
        Row: {
          user_id: string;
          /** Primer dia del mes, en ISO. */
          month: string;
          ingresos: number;
          gastos: number;
          saldo: number;
          movimientos: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Categoria = Database['public']['Tables']['categories']['Row'];
export type Movimiento = Database['public']['Tables']['transactions']['Row'];
export type Perfil = Database['public']['Tables']['profiles']['Row'];
export type TotalesDelMes = Database['public']['Views']['monthly_totals']['Row'];

/** Un movimiento con su categoria ya resuelta, que es como lo pide la lista. */
export type MovimientoConCategoria = Movimiento & {
  categories: Pick<Categoria, 'id' | 'name' | 'icon_key' | 'color_index'> | null;
};
