
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing your sign in...");

  useEffect(() => {
    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          setMessage("We couldn't complete your sign in. Please try again.");
          return;
        }
      }

      window.location.replace("/account");
    }

    finishSignIn();
  }, []);

  return (
    <main style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>Oraia by Dara</h1>
      <p>{message}</p>
    </main>
  );
}
