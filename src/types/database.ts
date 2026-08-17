/**
 * Tipos de la base — espejo de supabase/migrations/20260815000000_init.sql.
 * Se pueden regenerar con:
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TipoDeCuenta = 'bank' | 'card' | 'cash';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          currency: string;
          /** Con qué banco opera: define qué lectores usa la importación. */
          bank: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          currency?: string;
          bank?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          currency?: string;
          bank?: string;
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
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: TipoDeCuenta;
          currency: string;
          last4: string | null;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind?: TipoDeCuenta;
          currency?: string;
          last4?: string | null;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          kind?: TipoDeCuenta;
          currency?: string;
          last4?: string | null;
          archived?: boolean;
        };
        Relationships: [];
      };
      imports: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          source: string;
          file_name: string;
          period_start: string | null;
          period_end: string | null;
          rows_total: number;
          rows_imported: number;
          rows_skipped: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          source: string;
          file_name?: string;
          period_start?: string | null;
          period_end?: string | null;
          rows_total?: number;
          rows_imported?: number;
          rows_skipped?: number;
          created_at?: string;
        };
        Update: never;
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
          account_id: string | null;
          /** Plata que solo cambia de lugar: no es ni gasto ni ingreso. */
          is_transfer: boolean;
          import_id: string | null;
          /** Clave de la fila del archivo, para no importar dos veces lo mismo. */
          external_key: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          occurred_on?: string;
          amount: number;
          category_id?: string | null;
          description?: string;
          created_at?: string;
          account_id?: string | null;
          is_transfer?: boolean;
          import_id?: string | null;
          external_key?: string | null;
        };
        Update: {
          occurred_on?: string;
          amount?: number;
          category_id?: string | null;
          description?: string;
          account_id?: string | null;
          is_transfer?: boolean;
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
      account_balances: {
        Row: {
          user_id: string;
          account_id: string;
          name: string;
          kind: TipoDeCuenta;
          currency: string;
          saldo: number;
          movimientos: number;
          ultimo_movimiento: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Cuenta = Database['public']['Tables']['accounts']['Row'];
export type SaldoDeCuenta = Database['public']['Views']['account_balances']['Row'];
export type Importacion = Database['public']['Tables']['imports']['Row'];
export type Categoria = Database['public']['Tables']['categories']['Row'];
export type Movimiento = Database['public']['Tables']['transactions']['Row'];
export type Perfil = Database['public']['Tables']['profiles']['Row'];
export type TotalesDelMes = Database['public']['Views']['monthly_totals']['Row'];

/** Un movimiento con su categoria ya resuelta, que es como lo pide la lista. */
export type MovimientoConCategoria = Movimiento & {
  categories: Pick<Categoria, 'id' | 'name' | 'icon_key' | 'color_index'> | null;
};
