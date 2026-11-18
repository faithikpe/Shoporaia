
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

type CustomerAddress = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  delivery_address: string;
  address_label: string;
  is_default: boolean;
  created_at?: string;
};

type AddressForm = {
  full_name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  delivery_address: string;
  address_label: string;
  is_default: boolean;
};

type AccountView = "dashboard" | "profile" | "addresses";

const emptyAddress: AddressForm = {
  full_name: "",
  phone: "",
  country: "Nigeria",
  state: "",
  city: "",
  delivery_address: "",
  address_label: "Home",
  is_default: false,
};

export default function AccountPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<AccountView>("dashboard");

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        console.error("Profile loading error:", error.message);
      }

      if (data) {
        setProfile(data);
        setForm(data);
      }

      setLoading(false);
    }

    loadAccount();
  }, []);

  function openProfile() {
    window.history.pushState(null, "", "/account#profile");
    setView("profile");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openAddresses() {
    window.history.pushState(null, "", "/account#addresses");
    setView("addresses");
    setAddressMessage("");
    setShowAddressForm(false);
    setAddressesLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("Logged-in user ID:", user?.id);
      console.log("User authentication error:", userError);

      if (userError || !user) {
        setAddressMessage(
          "Unable to identify your logged-in account. Please sign in again."
        );
        return;
      }

      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Address records received:", data);
      console.log("Address loading error:", error);

      if (error) {
        setAddressMessage("Unable to load addresses: " + error.message);
        return;
      }

      setAddresses((data || []) as CustomerAddress[]);

      setAddressMessage(
        data && data.length > 0
          ? `Successfully loaded ${data.length} saved address(es).`
          : "No saved addresses found for this account."
      );
    } catch (error) {
      console.error("Address loading failed:", error);
      setAddressMessage(
        "Something went wrong while loading your addresses."
      );
    } finally {
      setAddressesLoading(false);
    }
  }

  // FIX: Automatically load saved addresses when the page opens
  // with #addresses in the URL, including after a refresh.
  useEffect(() => {
    function syncViewWithUrl() {
      const hash = window.location.hash;

      if (hash === "#profile") {
        setView("profile");
      } else if (hash === "#addresses") {
        openAddresses();
      } else {
        setView("dashboard");
      }
    }

    syncViewWithUrl();
    window.addEventListener("hashchange", syncViewWithUrl);

    return () => {
      window.removeEventListener("hashchange", syncViewWithUrl);
    };
  }, []);

  function backToDashboard() {
    window.location.href = "/";
  }

  function updateField(field: keyof CustomerProfile, value: string) {
    setForm((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );
  }

  async function saveProfile() {
    if (!form) return;

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  function startAddingAddress() {
    setAddressForm({
      ...emptyAddress,
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      country: profile?.country || "Nigeria",
      state: profile?.state || "",
      city: profile?.city || "",
      delivery_address: profile?.delivery_address || "",
      is_default: addresses.length === 0,
    });

    setEditingAddressId(null);
    setAddressMessage("");
    setShowAddressForm(true);
  }

  function startEditingAddress(address: CustomerAddress) {
    setAddressForm({
      full_name: address.full_name,
      phone: address.phone,
      country: address.country,
      state: address.state,
      city: address.city,
      delivery_address: address.delivery_address,
      address_label: address.address_label || "Home",
      is_default: address.is_default,
    });

    setEditingAddressId(address.id);
    setAddressMessage("");
    setShowAddressForm(true);
  }

  function updateAddressField(
    field: keyof AddressForm,
    value: string | boolean
  ) {
    setAddressForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveAddress() {
    if (
      !addressForm.full_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.state.trim() ||
      !addressForm.city.trim() ||
      !addressForm.delivery_address.trim()
    ) {
      setAddressMessage("Please fill in all required address fields.");
      return;
    }

    setAddressSaving(true);
    setAddressMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAddressSaving(false);
      window.location.href = "/login";
      return;
    }

    if (addressForm.is_default) {
      const { error: defaultError } = await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (defaultError) {
        setAddressMessage(defaultError.message);
        setAddressSaving(false);
        return;
      }
    }

    const addressData = {
      full_name: addressForm.full_name.trim(),
      phone: addressForm.phone.trim(),
      country: addressForm.country.trim() || "Nigeria",
      state: addressForm.state.trim(),
      city: addressForm.city.trim(),
      delivery_address: addressForm.delivery_address.trim(),
      address_label: addressForm.address_label,
      is_default: addressForm.is_default || addresses.length === 0,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (editingAddressId) {
      const result = await supabase
        .from("customer_addresses")
        .update(addressData)
        .eq("id", editingAddressId)
        .eq("user_id", user.id);

      error = result.error;
    } else {
      const result = await supabase
        .from("customer_addresses")
        .insert({
          ...addressData,
          user_id: user.id,
        });

      error = result.error;
    }

    if (error) {
      setAddressMessage("Unable to save address: " + error.message);
      setAddressSaving(false);
      return;
    }

    await openAddressesAfterSave(user.id);

    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddress);
    setAddressMessage("Address saved successfully!");
    setAddressSaving(false);
  }

  async function openAddressesAfterSave(userId: string) {
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to refresh saved addresses:", error);
      setAddressMessage(
        "Address saved, but refreshing the list failed: " + error.message
      );
      return;
    }

    setAddresses((data || []) as CustomerAddress[]);
  }

  async function deleteAddress(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this delivery address?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id);

    if (error) {
      setAddressMessage("Unable to delete address: " + error.message);
      return;
    }

    const remaining = addresses.filter((address) => address.id !== id);

    if (
      remaining.length > 0 &&
      addresses.find((a) => a.id === id)?.is_default
    ) {
      const { error: defaultError } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", remaining[0].id);

      if (defaultError) {
        setAddressMessage(
          "Address deleted, but the new default could not be set: " +
            defaultError.message
        );
      } else {
        remaining[0].is_default = true;
      }
    }

    setAddresses(remaining);
    setAddressMessage("Address deleted successfully.");
  }

  async function setDefaultAddress(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error: clearError } = await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    if (clearError) {
      setAddressMessage(clearError.message);
      return;
    }

    const { error } = await supabase
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setAddressMessage("Unable to set default address: " + error.message);
      return;
    }

    setAddresses((previous) =>
      previous.map((address) => ({
        ...address,
        is_default: address.id === id,
      }))
    );

    setAddressMessage("Default address updated successfully.");
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
        {view === "dashboard" && (
          <>
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
              <section className="rounded-2xl border border-pink-100 bg-white p-6">
                <h2 className="font-semibold text-gray-900">My Orders</h2>
                <p className="mt-2 text-sm text-gray-500">
                  View your purchases and track your orders.
                </p>
                <p className="mt-5 text-sm font-medium text-[#702b50]">
                  Coming soon
                </p>
              </section>

              <section className="rounded-2xl border border-pink-100 bg-white p-6">
                <h2 className="font-semibold text-gray-900">My Addresses</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Add, edit and manage your delivery addresses.
                </p>
                <button
                  type="button"
                  onClick={openAddresses}
                  className="mt-5 rounded-lg bg-[#702b50] px-5 py-3 text-sm font-medium text-white hover:bg-[#57203d]"
                >
                  Manage Addresses
                </button>
              </section>

              <section className="rounded-2xl border border-pink-100 bg-white p-6">
                <h2 className="font-semibold text-gray-900">My Invoices</h2>
                <p className="mt-2 text-sm text-gray-500">
                  View your payments and shipping invoices.
                </p>
                <p className="mt-5 text-sm font-medium text-[#702b50]">
                  Coming soon
                </p>
              </section>
            </div>

            <section className="mt-8 rounded-2xl border border-pink-100 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900">
                My Profile
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                View and update your personal information, contact details
                and delivery address.
              </p>

              <button
                type="button"
                onClick={openProfile}
                className="mt-5 rounded-lg bg-[#702b50] px-6 py-3 text-sm font-medium text-white hover:bg-[#57203d]"
              >
                View My Profile
              </button>
            </section>
          </>
        )}

        {view === "addresses" && (
          <section className="rounded-2xl border border-pink-100 bg-white p-6 sm:p-8">
            <button
              type="button"
              onClick={() => {
                window.history.pushState(null, "", "/account");
                setView("dashboard");
                setShowAddressForm(false);
              }}
              className="mb-6 rounded-lg border border-pink-200 px-4 py-3 text-sm font-medium text-[#702b50] hover:bg-pink-50"
            >
              ← Back to My Account
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Addresses
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  Manage your saved delivery addresses.
                </p>
              </div>

              {!showAddressForm && (
                <button
                  onClick={startAddingAddress}
                  className="rounded-lg bg-[#702b50] px-5 py-3 text-sm font-medium text-white hover:bg-[#57203d]"
                >
                  + Add New Address
                </button>
              )}
            </div>

            {addressMessage && (
              <p className="mt-5 break-words rounded-lg bg-pink-50 p-3 text-sm text-[#702b50]">
                {addressMessage}
              </p>
            )}

            {addressesLoading ? (
              <p className="mt-8 text-sm text-gray-500">
                Loading your addresses...
              </p>
            ) : showAddressForm ? (
              <div className="mt-8 rounded-xl border border-pink-100 p-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingAddressId ? "Edit Address" : "Add New Address"}
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Address label
                    </label>
                    <select
                      className={inputStyle}
                      value={addressForm.address_label}
                      onChange={(e) =>
                        updateAddressField("address_label", e.target.value)
                      }
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Full name *
                    </label>
                    <input
                      className={inputStyle}
                      value={addressForm.full_name}
                      onChange={(e) =>
                        updateAddressField("full_name", e.target.value)
                      }
                      placeholder="Recipient's full name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Phone number *
                    </label>
                    <input
                      className={inputStyle}
                      value={addressForm.phone}
                      onChange={(e) =>
                        updateAddressField("phone", e.target.value)
                      }
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      className={inputStyle}
                      value={addressForm.country}
                      onChange={(e) =>
                        updateAddressField("country", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      State *
                    </label>
                    <input
                      className={inputStyle}
                      value={addressForm.state}
                      onChange={(e) =>
                        updateAddressField("state", e.target.value)
                      }
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      className={inputStyle}
                      value={addressForm.city}
                      onChange={(e) =>
                        updateAddressField("city", e.target.value)
                      }
                      placeholder="City"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Delivery address *
                    </label>
                    <textarea
                      className={inputStyle}
                      rows={4}
                      value={addressForm.delivery_address}
                      onChange={(e) =>
                        updateAddressField("delivery_address", e.target.value)
                      }
                      placeholder="House number, street, area and other details"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={addressForm.is_default}
                        onChange={(e) =>
                          updateAddressField("is_default", e.target.checked)
                        }
                        className="h-4 w-4 accent-[#702b50]"
                      />
                      Set as my default delivery address
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:col-span-2">
                    <button
                      type="button"
                      onClick={saveAddress}
                      disabled={addressSaving}
                      className="rounded-lg bg-[#702b50] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {addressSaving ? "Saving..." : "Save Address"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        setAddressMessage("");
                      }}
                      disabled={addressSaving}
                      className="rounded-lg border border-pink-200 px-6 py-3 text-sm font-medium text-[#702b50]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-pink-200 p-8 text-center">
                <h2 className="font-semibold text-gray-900">
                  No saved addresses yet
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Add a delivery address to make future orders easier.
                </p>
                <button
                  onClick={startAddingAddress}
                  className="mt-5 rounded-lg bg-[#702b50] px-6 py-3 text-sm font-medium text-white"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-xl border border-pink-100 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-semibold text-gray-900">
                        {address.address_label || "Delivery Address"}
                      </h2>

                      {address.is_default && (
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-[#702b50]">
                          Default Address
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-900">
                        {address.full_name}
                      </p>
                      <p>{address.phone}</p>
                      <p>{address.delivery_address}</p>
                      <p>
                        {address.city}, {address.state}
                      </p>
                      <p>{address.country}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditingAddress(address)}
                        className="rounded-lg border border-pink-200 px-4 py-2 text-sm font-medium text-[#702b50]"
                      >
                        Edit
                      </button>

                      {!address.is_default && (
                        <button
                          onClick={() => setDefaultAddress(address.id)}
                          className="rounded-lg border border-pink-200 px-4 py-2 text-sm font-medium text-[#702b50]"
                        >
                          Set as Default
                        </button>
                      )}

                      <button
                        onClick={() => deleteAddress(address.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "profile" && (
          <section className="rounded-2xl border border-pink-100 bg-white p-6 sm:p-8">
            <button
              type="button"
              onClick={backToDashboard}
              className="mb-6 inline-flex items-center gap-2 rounded-lg border border-pink-200 px-4 py-3 text-sm font-medium text-[#702b50] transition hover:bg-pink-50"
            >
              <span aria-hidden="true">←</span>
              Back to Dashboard
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Profile
                </h1>
                <p className="mt-2 text-sm text-gray-500">
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
                      onChange={(e) =>
                        updateField("full_name", e.target.value)
                      }
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
                      onChange={(e) =>
                        updateField("phone", e.target.value)
                      }
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
                      onChange={(e) =>
                        updateField("state", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      className={inputStyle}
                      value={form.city || ""}
                      onChange={(e) =>
                        updateField("city", e.target.value)
                      }
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
        )}
      </div>
    </main>
  );
}
