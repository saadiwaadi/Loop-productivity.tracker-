import { createClient } from "@supabase/supabase-js";

console.log("VITE_SUPABASE_URL (redacted):", import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.slice(0, 4) + '...' + import.meta.env.VITE_SUPABASE_URL.slice(-4) : 'undefined');
console.log("VITE_SUPABASE_PUBLISHABLE_KEY (redacted):", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.slice(0, 4) + '...' + import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.slice(-4) : 'undefined');

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
