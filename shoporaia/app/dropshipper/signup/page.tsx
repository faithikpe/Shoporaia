
"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DropshipperSignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            username: username.trim(),
            phone: phone.trim(),
            state: state.trim(),
            city: city.trim(),
            delivery_address: address.trim(),
            country: "Nigeria",
            account_type: "dropshipper",
          },
        },
      });

      if (error) {
        setMessage(`Registration failed: ${error.message}`);
        return;
      }

      if (!data.user) {
        setMessage("Supabase did not return a user. Please try again.");
        return;
      }

      setSuccess(true);

      setMessage(
        data.session
          ? "Your account was created and you are signed in. Email confirmation may be disabled for this project."
          : "Your account was created. Please check your email, including your spam folder, for the confirmation link."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unexpected error: ${error.message}`
          : "An unexpected registration error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-lg sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.3em] text-pink-600">
            SHOPORAIA
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Become a Dropshipper
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create your dropshipper account to access the exclusive catalogue.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

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
              Phone Number
            </label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Your state"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Delivery Address
            </label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your delivery address"
              rows={3}
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
              placeholder="Create a password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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
            Show passwords
          </label>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-pink-50 text-pink-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 px-4 py-3 font-semibold text-white transition hover:bg-pink-700 disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Dropshipper Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have a dropshipper account?{" "}
          <Link
            href="/dropshipper/login"
            className="font-semibold text-pink-600 hover:underline"
          >
            Log in
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
