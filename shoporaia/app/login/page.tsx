
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setMessage("Please verify your email before signing in.");
      return;
    }

    window.location.href = "/account";
  }

  async function handleGoogleLogin() {
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setMessage(error.message);
  }

  return (
    <main className="min-h-screen bg-[#fffafc] px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-3xl font-bold text-[#702b50]">
            ORAIA <span className="text-gray-800">BY DARA</span>
          </a>
          <p className="mt-3 text-sm text-gray-500">
            Welcome back. Sign in to your account.
          </p>
        </div>

        <div className="rounded-3xl border border-pink-100 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-2xl font-semibold text-gray-900">
            Customer sign in
          </h1>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-7 w-full rounded-xl border border-gray-200 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">OR SIGN IN WITH EMAIL</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-pink-400"
              />

              <label className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Show password
              </label>
            </div>

            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm font-medium text-[#702b50] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {message && (
              <div className="rounded-xl bg-pink-50 p-4 text-sm text-[#702b50]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#702b50] px-5 py-4 font-semibold text-white hover:bg-[#57203d] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-semibold text-[#702b50] hover:underline"
            >
              Create one
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
