// Replace these two values with the Project URL and public anon key from Supabase.
// Never place a service-role key here.
export const SUPABASE_URL = "https://hfsvsszxzldilssyiucd.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_1lzMEY0CLneUN5z7POeW2w_3v3HKTA8";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  !SUPABASE_ANON_KEY.includes("YOUR-PUBLIC")
);

export const APP_REDIRECT_URL = `${window.location.origin}${window.location.pathname}`;
