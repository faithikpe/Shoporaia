
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
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
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Your account has been created! Please check your email and click the confirmation link before signing in."
    );
  }

  const inputClass =
    "mt-2 mb-5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#bd668c] focus:ring-2 focus:ring-pink-100";

  const labelClass = "block text-sm font-semibold text-gray-800";

  return (
    <main className="min-h-screen bg-[#fff8fb] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-[0_12px_35px_rgba(112,43,80,0.08)] sm:p-9">
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-bold text-[#702b50]">
              ORAIA <span className="text-gray-800">BY DARA</span>
            </Link>

            <h1 className="mt-5 text-2xl font-semibold text-gray-900">
              Create Your Account
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Join us and enjoy a seamless shopping experience.
            </p>
          </div>

          <form onSubmit={handleSignup}>
            <label className={labelClass}>Full Name</label>
            <input
              className={inputClass}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />

            <label className={labelClass}>Username</label>
            <input
              className={inputClass}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
            />

            <label className={labelClass}>Email Address</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <label className={labelClass}>Phone Number</label>
            <input
              className={inputClass}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required
            />

            <label className={labelClass}>Country</label>
            <input
              className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-700`}
              value="Nigeria"
              disabled
            />

            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Enter your state"
              required
            />

            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city"
              required
            />

            <label className={labelClass}>Delivery Address</label>
            <textarea
              className={`${inputClass} min-h-[100px] resize-y`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your full delivery address"
              required
            />

            <label className={labelClass}>Password</label>
            <input
              className={inputClass}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              minLength={8}
              required
            />

            <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="accent-[#702b50]"
              />
              Show password
            </label>

            <label className={labelClass}>Confirm Password</label>
            <input
              className={inputClass}
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter your password again"
              required
            />

            <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showConfirmPassword}
                onChange={(e) =>
                  setShowConfirmPassword(e.target.checked)
                }
                className="accent-[#702b50]"
              />
              Show confirmation password
            </label>

            {message && (
              <p className="mb-5 rounded-xl bg-pink-50 p-4 text-sm leading-relaxed text-[#702b50]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#702b50] px-5 py-4 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#57203d] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-gray-700">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#702b50] hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
