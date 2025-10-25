import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ordltivosgvneenlmgur.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZGx0aXZvc2d2bmVlbmxtZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODg1ODYsImV4cCI6MjA3MTM2NDU4Nn0.URMdaXj4SPtK-gcqtA7KLeZfCH7tfRNiolkJ16JAJ2s"; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);