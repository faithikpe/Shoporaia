
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

  const inputStyle = {
    width: "100%",
    padding: "13px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginTop: "6px",
    marginBottom: "16px",
    fontSize: "15px",
    boxSizing: "border-box" as const,
  };

  return (
    <main style={{
      minHeight: "100vh",
      padding: "40px 20px",
      background: "#fff8fb",
    }}>
      <div style={{
        maxWidth: "500px",
        margin: "auto",
        background: "white",
        padding: "30px 24px",
        borderRadius: "14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}>
        <h1 style={{
          textAlign: "center",
          fontSize: "28px",
          color: "#bd668c",
          marginBottom: "8px",
        }}>
          Oraia by Dara
        </h1>

        <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
          Create Your Account
        </h2>

        <p style={{
          textAlign: "center",
          color: "#777",
          marginBottom: "25px",
        }}>
          Join us and enjoy a seamless shopping experience.
        </p>

        <form onSubmit={handleSignup}>
          <label>Full Name</label>
          <input
            style={inputStyle}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
          />

          <label>Username</label>
          <input
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            required
          />

          <label>Email Address</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label>Phone Number</label>
          <input
            style={inputStyle}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            required
          />

          <label>Country</label>
          <input
            style={{ ...inputStyle, background: "#f5f5f5" }}
            value="Nigeria"
            disabled
          />

          <label>State</label>
          <input
            style={inputStyle}
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Enter your state"
            required
          />

          <label>City</label>
          <input
            style={inputStyle}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter your city"
            required
          />

          <label>Delivery Address</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
            }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your full delivery address"
            required
          />

          <label>Password</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={8}
            required
          />

          <label>Confirm Password</label>
          <input
            style={inputStyle}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Enter your password again"
            required
          />

          {message && (
            <p style={{
              padding: "12px",
              background: "#fff0f5",
              color: "#9b456a",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
            }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#bd668c",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          marginTop: "22px",
          color: "#666",
        }}>
          Already have an account?{" "}
          <Link href="/login" style={{
            color: "#bd668c",
            fontWeight: "bold",
          }}>
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
