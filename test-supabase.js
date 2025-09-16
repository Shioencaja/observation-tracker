// Simple test to check Supabase connection
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tnhptcxqtvdguvsjnoty.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuaHB0Y3hxdHZkZ3V2c2pub3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzkzNjgsImV4cCI6MjA3MzU1NTM2OH0.YA79jGOEc_xyjzuNQAo_oiYv-uwfNad8IjwS5bHGL8Y";

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

// Test basic connection
supabase.auth
  .getSession()
  .then(({ data, error }) => {
    console.log("✅ Supabase connection successful!");
    console.log("Session data:", data);
    if (error) {
      console.log("Error:", error);
    }
  })
  .catch((err) => {
    console.error("❌ Supabase connection failed:", err);
  });

// Test with timeout
setTimeout(() => {
  console.log("⏰ Connection test timed out after 10 seconds");
  process.exit(1);
}, 10000);
