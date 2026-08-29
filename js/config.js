const SUPABASE_URL = "https://fmlummlkevcfnizaazwz.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbHVtbWxrZXZjZm5pemFhend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NjQ0ODgsImV4cCI6MjEwMzU0MDQ4OH0.peOR0MsHX7iAqpxCL4pHKIMxvI_DOw0mCnDOGw9j2Qk"; // Cole sua chave anon aqui

var RESTAURANTE = {
  nome: "Zero Grau",
  whatsapp: "5513999999999" // Coloque seu número de WhatsApp aqui
};

var supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}