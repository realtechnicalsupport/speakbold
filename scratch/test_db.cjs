
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://xriasdhqzapgwnszkvzp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaWFzZGhxemFwZ3duc3prdnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDQ1NTUsImV4cCI6MjA5MzE4MDU1NX0.-hmsunrNsdM2ZC11-MraSkqFcUje7HHG8_apuOxNvsw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkElo() {
  console.log("Fetching all profiles to check ELO levels...");
  const { data, error } = await supabase.from('profiles').select('id, display_name, xp, elo');
  
  if (error) {
    console.error("Fetch failed:", error);
  } else {
    console.log("Profiles:", data);
  }
}

checkElo();
