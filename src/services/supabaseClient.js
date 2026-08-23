const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_')) {
  console.warn("Supabase credentials not fully configured.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
