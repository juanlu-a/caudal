const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabaseUrl = url ?? null;
export const supabaseKey = key ?? null;

/**
 * Sin credenciales de Supabase la app corre igual, contra un almacen local
 * sembrado con datos de ejemplo. Sirve para ver la marca funcionando en el
 * telefono antes de tener backend; los datos no salen del dispositivo.
 */
export const modoDemo = !url || !key;
