import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { token } = await req.json();
    if (!token) throw new Error("Missing token");

    // Look up profile by magic_token
    const { data: profile, error: lookupError } = await adminClient
      .from("profiles")
      .select("email")
      .eq("magic_token", token)
      .single();

    if (lookupError || !profile?.email) {
      throw new Error("Invalid or expired token");
    }

    // Generate a fresh short-lived Supabase magic link for this user
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
      options: {
        redirectTo: "https://fraimeworksbudget.lovable.app/auth/callback",
      },
    });
    if (error) throw error;

    const authLink = data.properties.action_link;

    return new Response(JSON.stringify({ authLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
