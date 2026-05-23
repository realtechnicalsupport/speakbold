
import { createClient } from '@supabase/supabase-api'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function checkSchema() {
  const { data, error } = await supabase
    .from('arena_battles')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching schema:', error)
  } else {
    console.log('Columns in arena_battles:', Object.keys(data[0] || {}))
  }
}

checkSchema()
