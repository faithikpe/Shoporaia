
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CustomerProfile = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  delivery_address: string | null;
  country: string | null;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error.message);
      }

      if (data) {
        setProfile(data);
        setForm(data);
      }

      setLoading(false);
    }

    loadAccount();
  }, []);

  function updateField(field: keyof CustomerProfile, value: string) {
    setForm((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );
  }

  async function saveProfile() {
    if (!form) return;

    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("customer_profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone,
        state: form.state,
        city: form.city,
        delivery_address: form.delivery_address,
        country: form.country,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      setMessage("Unable to save your profile: " + error.message);
      return;
    }

    setProfile(form);
    setEditing(false);
    setMessage("Your profile has been updated successfully!");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const inputStyle =
    "mt-2 w-full rounded-lg border border-pink-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#bd668c]";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffafc]">
        <p className="text-[#702b50]">Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffafc]">
      <header className="border-b border-pink-100 bg-white px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-xl font-bold text-[#702b50]">
            ORAIA BY DARA
          </a>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-pink-200 px-4 py-2 text-sm font-medium text-[#702b50] hover:bg-pink-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm text-[#702b50]">MY ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || "Customer"}!
          </h1>
          <p className="mt-2 text-gray-500">
            Manage your Oraia by Dara shopping account.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["My Orders", "View your purchases and track your orders."],
            ["My Addresses", "Manage your delivery addresses."],
            ["My Invoices", "View your payments and shipping invoices."],
          ].map(([title, description]) => (
            <section
              key={title}
              className="rounded-2xl border border-pink-100 bg-white p-6"
            >
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm text-gray-500">{description}</p>
              <p className="mt-5 text-sm font-medium text-[#702b50]">
                Coming soon
              </p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-pink-100 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                My Profile
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and manage your personal information.
              </p>
            </div>

            {!editing && profile && (
              <button
                onClick={() => {
                  setForm(profile);
                  setEditing(true);
                  setMessage("");
                }}
                className="rounded-lg bg-[#702b50] px-5 py-3 text-sm font-medium text-white hover:bg-[#57203d]"
              >
                Edit Profile
              </button>
            )}
          </div>

          {message && (
            <p className="mt-5 rounded-lg bg-pink-50 p-3 text-sm text-[#702b50]">
              {message}
            </p>
          )}

          {form ? (
            editing ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    className={inputStyle}
                    value={form.full_name || ""}
                    onChange={(e) => updateField("full_name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    className={`${inputStyle} bg-gray-100`}
                    value={form.username || ""}
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Username cannot be changed here.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    className={`${inputStyle} bg-gray-100`}
                    value={form.email || ""}
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Email cannot be changed here.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Phone number
                  </label>
                  <input
                    className={inputStyle}
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    className={`${inputStyle} bg-gray-100`}
                    value={form.country || "Nigeria"}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    className={inputStyle}
                    value={form.state || ""}
                    onChange={(e) => updateField("state", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    className={inputStyle}
                    value={form.city || ""}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    Delivery address
                  </label>
                  <textarea
                    className={inputStyle}
                    rows={4}
                    value={form.delivery_address || ""}
                    onChange={(e) =>
                      updateField("delivery_address", e.target.value)
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-lg bg-[#702b50] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    onClick={() => {
                      setForm(profile);
                      setEditing(false);
                      setMessage("");
                    }}
                    disabled={saving}
                    className="rounded-lg border border-pink-200 px-6 py-3 text-sm font-medium text-[#702b50]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : profile ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  ["Full name", profile.full_name],
                  ["Username", profile.username],
                  ["Email address", profile.email],
                  ["Phone number", profile.phone],
                  ["Country", profile.country],
                  ["State", profile.state],
                  ["City", profile.city],
                  ["Delivery address", profile.delivery_address],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-medium uppercase text-gray-400">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm text-gray-800">
                      {value || "Not provided"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-gray-500">
                Your profile could not be loaded. Please refresh the page.
              </p>
            )
          ) : (
            <p className="mt-5 text-sm text-gray-500">
              Your profile could not be loaded. Please refresh the page.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
