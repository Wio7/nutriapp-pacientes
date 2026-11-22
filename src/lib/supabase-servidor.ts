import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con la clave service_role, SOLO para el Storage de fotos (bucket privado nutri-fotos).
 * Los pacientes no son usuarios de Supabase Auth, así que no hay política de Storage que los deje subir.
 * Todo lo demás (tablas) va por las funciones nutri_paciente_* con el token del paciente.
 */
let cliente: SupabaseClient | null = null;

export function storageFotos() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor');
  cliente ??= createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente.storage.from('nutri-fotos');
}
