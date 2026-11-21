
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DropshipperLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setLoading(false);
      setMessage("Please confirm your email address before logging in.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("account_type")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileError || profile?.account_type !== "dropshipper") {
      await supabase.auth.signOut();
      setLoading(false);
      setMessage(
        "This account is not registered as a dropshipper. Please use the correct login page."
      );
      return;
    }

    setLoading(false);
    router.push("/dropshipper");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-lg sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.3em] text-pink-600">
            SHOPORAIA
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Dropshipper Login
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to access your dropshipper dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="accent-pink-600"
            />
            Show password
          </label>

          {message && (
            <div className="rounded-xl bg-pink-50 p-3 text-sm text-pink-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 px-4 py-3 font-semibold text-white transition hover:bg-pink-700 disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have a dropshipper account?{" "}
          <Link
            href="/dropshipper/signup"
            className="font-semibold text-pink-600 hover:underline"
          >
            Register here
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-pink-600">
            Back to ShopOraia
          </Link>
        </p>
      </div>
    </main>
  );
}
