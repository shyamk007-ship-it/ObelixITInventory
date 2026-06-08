import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
"https://qztvxlkmniecycbnflob.supabase.co";

const supabaseAnonKey =
"sb_publishable_MVCUispfOQnLJ7TyrQ71PQ__48kiGJc";

export const supabase =
createClient(
supabaseUrl,
supabaseAnonKey
);
