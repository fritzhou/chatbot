// =========================================================
// Single shared Supabase client.
// Architecture: Frontend -> Supabase Client -> Supabase API -> PostgreSQL
// =========================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
  console.warn(
    "[Supabase] config.js still has placeholder values. " +
    "Update config.js with your project URL and anon key."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
