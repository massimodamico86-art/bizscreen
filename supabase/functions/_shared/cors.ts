/**
 * Shared CORS headers for Supabase Edge Functions.
 *
 * The _shared/ prefix is the Supabase convention to prevent this directory
 * from being deployed as a standalone Edge Function.
 *
 * Includes required Supabase-specific headers (authorization, x-client-info,
 * apikey) alongside standard content-type.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};
