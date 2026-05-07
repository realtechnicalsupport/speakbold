const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
  const [
    { count: learnersCount },
    { count: drillsCount },
    { count: aiCount },
    { data: durData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("recordings").select("*", { count: "exact", head: true }),
    supabase.from("recording_feedback").select("*", { count: "exact", head: true }),
    supabase.from("recordings").select("duration_ms"),
  ]);

  console.log({
    learnersCount,
    drillsCount,
    aiCount,
    totalMs: durData?.reduce((acc, r) => acc + (r.duration_ms || 0), 0)
  });
}

checkStats();
