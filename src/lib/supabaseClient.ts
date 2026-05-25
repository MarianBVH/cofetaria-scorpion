import { createClient } from '@supabase/supabase-js'

// Preluăm cheile din fișierul .env.local pe care l-ai creat anterior
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Creăm și exportăm clientul pentru a-l folosi în alte fișiere
export const supabase = createClient(supabaseUrl, supabaseAnonKey)