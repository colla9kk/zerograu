// Configuração Global do Supabase
const SUPABASE_URL = "https://fmlummlkevcfnizaazwz.supabase.co"; // Substitua pela sua URL do Supabase
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbHVtbWxrZXZjZm5pemFhend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NjQ0ODgsImV4cCI6MjEwMzU0MDQ4OH0.peOR0MsHX7iAqpxCL4pHKIMxvI_DOw0mCnDOGw9j2Qk"; // Substitua pela sua chave anon publica do Supabase

var supabaseClient = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const RESTAURANTE = {
  nome: "Zero Grau Hamburgueria",
  whatsapp: "554298292510" // Coloque o número do WhatsApp com DDD
};