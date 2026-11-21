
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  country: string | null;
  state: string | null;
  city: string | null;
  delivery_address: string | null;
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
  address_label: string | null;
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

type CustomerOrder = {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  shipping_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_notes: string | null;
  subtotal: number;
  total_amount: number;
  currency: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type CustomerInvoice = {
  id: string;
  order_id: string | null;
  invoice_number: string;
  invoice_type: string | null;
  amount: number;
  payment_status: string;
  due_date: string | null;
  created_at: string;
};

type CustomerReceipt = {
  id: string;
  order_id: string | null;
  receipt_number: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
};

type AccountView =
  | "dashboard"
  | "profile"
  | "addresses"
  | "orders"
  | "invoices"
  | "receipts";

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

const inputStyle =
  "w-full rounded-xl border border-[#eadce6] bg-white px-4 py-3 text-sm text-[#302331] placeholder:text-gray-400 outline-none focus:border-[#75436d] focus:ring-2 focus:ring-[#75436d]/10";

const labelStyle = "mb-2 block text-sm font-medium text-[#43243b]";

function formatMoney(amount: number, currency = "NGN") {
  const value = Number(amount || 0);

  if (currency === "NGN" || currency === "₦") {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status: string | null | undefined) {
  const value = (status || "").toLowerCase();

  if (value.includes("partially paid")) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    value === "paid" ||
    value.includes("delivered") ||
    value.includes("completed") ||
    value.includes("confirmed")
  ) {
    return "bg-green-100 text-green-800";
  }

  if (
    value.includes("pending") ||
    value.includes("processing") ||
    value.includes("transit") ||
    value.includes("unpaid")
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    value.includes("cancelled") ||
    value.includes("failed") ||
    value.includes("overdue")
  ) {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-700";
}

export default function AccountPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [view, setView] = useState<AccountView>("dashboard");

  const [profile, setProfile] = useState<CustomerProfile>({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    country: "Nigeria",
    state: "",
    city: "",
    delivery_address: "",
  });

  const [profileForm, setProfileForm] = useState<CustomerProfile>({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    country: "Nigeria",
    state: "",
    city: "",
    delivery_address: "",
  });

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email_confirmed_at) {
      router.replace("/login", {});
      return;
    }

    setUserId(user.id);

    const { data: profileData, error: profileError } = await supabase
      .from("customer_profiles")
      .select(
        "full_name, username, email, phone, country, state, city, delivery_address"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setError("Unable to load your profile. Please refresh the page.");
    }

    const loadedProfile: CustomerProfile = {
      full_name: profileData?.full_name || "",
      username: profileData?.username || "",
      email: profileData?.email || user.email || "",
      phone: profileData?.phone || "",
      country: profileData?.country || "Nigeria",
      state: profileData?.state || "",
      city: profileData?.city || "",
      delivery_address: profileData?.delivery_address || "",
    };

    setProfile(loadedProfile);
    setProfileForm(loadedProfile);

    const { data: addressData } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email_confirmed_at) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);

    const { data: profileData, error: profileError } = await supabase
      .from("customer_profiles")
      .select(
        "full_name, username, email, phone, country, state, city, delivery_address"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setError("Unable to load your profile. Please refresh the page.");
    }

    const loadedProfile: CustomerProfile = {
      full_name: profileData?.full_name || "",
      username: profileData?.username || "",
      email: profileData?.email || user.email || "",
      phone: profileData?.phone || "",
      country: profileData?.country || "Nigeria",
      state: profileData?.state || "",
      city: profileData?.city || "",
      delivery_address: profileData?.delivery_address || "",
    };

    setProfile(loadedProfile);
    setProfileForm(loadedProfile);

    const { data: addressData } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    setAddresses((addressData || []) as CustomerAddress[]);

    const { data: orderData, error: orderError } = await supabase
      .from("customer_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      setError("Unable to load your orders. Please refresh the page.");
    }

    const customerOrders = (orderData || []) as CustomerOrder[];
    setOrders(customerOrders);

    if (customerOrders.length > 0) {
      const orderIds = customerOrders.map((order) => order.id);

      const { data: itemData } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      const itemsWithImages = await Promise.all(
        (itemData || []).map(async (item) => {
          let imageUrl = item.product_image || "";

          if (imageUrl && !imageUrl.startsWith("http")) {
            const { data: signedImage } = await supabase.storage
              .from("product-images")
              .createSignedUrl(imageUrl, 3600);

            imageUrl = signedImage?.signedUrl || "";
          }

          return {
            ...item,
            product_image: imageUrl || null,
          };
        })
      );

      setOrderItems(itemsWithImages as OrderItem[]);
    } else {
      setOrderItems([]);
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("customer_invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (invoiceError) {
      setError("Unable to load your invoices. Please refresh the page.");
    }

    setInvoices((invoiceData || []) as CustomerInvoice[]);

    const { data: receiptData, error: receiptError } = await supabase
      .from("customer_receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (receiptError) {
      setError("Unable to load your receipts. Please refresh the page.");
    }

    setReceipts((receiptData || []) as CustomerReceipt[]);

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace("#", "");

      if (
        hash === "profile" ||
        hash === "addresses" ||
        hash === "orders" ||
        hash === "invoices" ||
        hash === "receipts"
      ) {
        setView(hash);
      } else {
        setView("dashboard");
      }
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function navigate(nextView: AccountView) {
    setView(nextView);

    window.history.replaceState(
      null,
      "",
      `/account${nextView === "dashboard" ? "" : `#${nextView}`}`
    );

    setMessage("");
    setError("");
  }

  async function saveProfile() {
    if (!userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { error: saveError } = await supabase
      .from("customer_profiles")
      .upsert(
        {
          user_id: userId,
          full_name: profileForm.full_name,
          username: profileForm.username,
          email: profileForm.email,
          phone: profileForm.phone,
          country: profileForm.country,
          state: profileForm.state,
          city: profileForm.city,
          delivery_address: profileForm.delivery_address,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (saveError) {
      setError(`Unable to save your profile: ${saveError.message}`);
    } else {
      setProfile(profileForm);
      setMessage("Your profile has been updated successfully.");
    }

    setSaving(false);
  }

  function openNewAddress() {
    setAddressForm({
      ...emptyAddress,
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      country: profile.country || "Nigeria",
      state: profile.state || "",
      city: profile.city || "",
      delivery_address: profile.delivery_address || "",
    });

    setEditingAddressId(null);
    setShowAddressForm(true);
    setMessage("");
    setError("");
  }

  function openEditAddress(address: CustomerAddress) {
    setAddressForm({
      full_name: address.full_name || "",
      phone: address.phone || "",
      country: address.country || "Nigeria",
      state: address.state || "",
      city: address.city || "",
      delivery_address: address.delivery_address || "",
      address_label: address.address_label || "Home",
      is_default: address.is_default || false,
    });

    setEditingAddressId(address.id);
    setShowAddressForm(true);
    setMessage("");
    setError("");
  }

  async function saveAddress() {
    if (!userId) return;

    if (
      !addressForm.full_name ||
      !addressForm.phone ||
      !addressForm.state ||
      !addressForm.city ||
      !addressForm.delivery_address
    ) {
      setError("Please complete all required address fields.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (addressForm.is_default) {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }

    const addressPayload = {
      user_id: userId,
      full_name: addressForm.full_name,
      phone: addressForm.phone,
      country: addressForm.country,
      state: addressForm.state,
      city: addressForm.city,
      delivery_address: addressForm.delivery_address,
      address_label: addressForm.address_label,
      is_default: addressForm.is_default,
    };

    const result = editingAddressId
      ? await supabase
          .from("customer_addresses")
          .update(addressPayload)
          .eq("id", editingAddressId)
          .eq("user_id", userId)

      : await supabase.from("customer_addresses").insert(addressPayload);

    if (result.error) {
      setError(`Unable to save address: ${result.error.message}`);
    } else {
      setMessage("Your address has been saved.");
      setShowAddressForm(false);

      const { data } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      setAddresses((data || []) as CustomerAddress[]);
    }

    setSaving(false);
  }

  async function deleteAddress(addressId: string) {
    if (
      !userId ||
      !window.confirm("Are you sure you want to delete this address?")
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId);

    if (deleteError) {
      setError(`Unable to delete address: ${deleteError.message}`);
    } else {
      setAddresses((previous) =>
        previous.filter((address) => address.id !== addressId)
      );
      setMessage("Address deleted.");
    }
  }

  async function setDefaultAddress(addressId: string) {
    if (!userId) return;

    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", userId);

    const { error: updateError } = await supabase
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("user_id", userId);

    if (updateError) {
      setError(`Unable to update default address: ${updateError.message}`);
    } else {
      const { data } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });

      setAddresses((data || []) as CustomerAddress[]);
      setMessage("Default address updated.");
    }
  }

  async function continuePayment(orderId: string) {
    if (payingOrderId) return;

    setError("");
    setMessage("");
    setPayingOrderId(orderId);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (!response.ok || !result.authorization_url) {
        throw new Error(
          result.error || "Unable to continue payment. Please try again."
        );
      }

      window.location.assign(result.authorization_url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to continue payment. Please try again."
      );
      setPayingOrderId(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function printDocument() {
    window.print();
  }

  function itemsForOrder(orderId: string) {
    return orderItems.filter((item) => item.order_id === orderId);
  }

  function orderNumberFor(orderId: string | null) {
    if (!orderId) return "Not linked to an order";

    return (
      orders.find((order) => order.id === orderId)?.order_number || "Order"
    );
  }

  const outstandingBalance = invoices.reduce((total, invoice) => {
    const status = (invoice.payment_status || "").toLowerCase();

    if (status === "paid" || status === "completed") {
      return total;
    }

    const paymentsForInvoice = receipts
      .filter((receipt) => receipt.order_id === invoice.order_id)
      .reduce(
        (sum, receipt) => sum + Number(receipt.amount || 0),
        0
      );

    return total + Math.max(
      0,
      Number(invoice.amount || 0) - paymentsForInvoice
    );
  }, 0);

  const paidTotal = receipts.reduce(
    (total, receipt) => total + Number(receipt.amount || 0),
    0
  );

  const pageTitle: Record<AccountView, string> = {
    dashboard: "My Account",
    profile: "My Profile",
    addresses: "My Addresses",
    orders: "My Orders",
    invoices: "My Invoices",
    receipts: "My Receipts",
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc] px-5">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#eadce6] border-t-[#75436d]" />
          <p className="text-sm text-[#43243b]">
            Loading your account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fc] px-4 py-8 text-[#302331] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/")}
              className="mb-3 text-sm font-medium text-[#75436d] hover:underline"
            >
              ← Back to shopping
            </button>

            <h1 className="text-3xl font-bold text-[#43243b]">
              {pageTitle[view]}
            </h1>

            <p className="mt-2 text-sm text-[#756574]">
              Welcome back,{" "}
              {profile.full_name || profile.username || "Customer"}.
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-xl border border-[#eadce6] bg-white px-5 py-3 text-sm font-semibold text-[#43243b] hover:bg-[#f9edf5]"
          >
            Sign out
          </button>
        </header>

        {(message || error) && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm ${
              error
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-[#f0e2ec] bg-white p-4 shadow-sm">
            <div className="mb-5 rounded-xl bg-[#f9edf5] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#856b80]">
                Signed in as
              </p>
              <p className="mt-2 break-words text-sm font-semibold text-[#43243b]">
                {profile.email}
              </p>
            </div>

            <nav className="space-y-2">
              {(
                [
                  ["dashboard", "Dashboard"],
                  ["orders", "My Orders"],
                  ["invoices", "My Invoices"],
                  ["receipts", "My Receipts"],
                  ["addresses", "My Addresses"],
                  ["profile", "My Profile"],
                ] as [AccountView, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    view === key
                      ? "bg-[#75436d] text-white"
                      : "text-[#5f4b5c] hover:bg-[#f9edf5]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            {view === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total Orders",
                      value: orders.length,
                      action: "orders" as AccountView,
                    },
                    {
                      label: "Invoices",
                      value: invoices.length,
                      action: "invoices" as AccountView,
                    },
                    {
                      label: "Receipts",
                      value: receipts.length,
                      action: "receipts" as AccountView,
                    },
                    {
                      label: "Saved Addresses",
                      value: addresses.length,
                      action: "addresses" as AccountView,
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.action)}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-sm text-[#756574]">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-[#43243b]">
                        {item.value}
                      </p>
                      <p className="mt-3 text-xs font-semibold text-[#75436d]">
                        View details →
                      </p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#756574]">
                      Outstanding Invoice Balance
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[#43243b]">
                      {formatMoney(outstandingBalance)}
                    </p>
                    <button
                      onClick={() => navigate("invoices")}
                      className="mt-4 text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View invoices →
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6 shadow-sm">
                    <p className="text-sm text-[#756574]">
                      Total Payments Recorded
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[#43243b]">
                      {formatMoney(paidTotal)}
                    </p>
                    <button
                      onClick={() => navigate("receipts")}
                      className="mt-4 text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View receipts →
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-[#43243b]">
                      Recent Orders
                    </h2>
                    <button
                      onClick={() => navigate("orders")}
                      className="text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View all orders →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <p className="rounded-xl bg-[#fff8fc] p-5 text-sm text-[#756574]">
                      You have no orders yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0e2ec] p-4"
                        >
                          <div>
                            <p className="font-semibold text-[#43243b]">
                              {order.order_number}
                            </p>
                            <p className="mt-1 text-xs text-[#756574]">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#43243b]">
                              {formatMoney(
                                order.total_amount,
                                order.currency || "NGN"
                              )}
                            </p>
                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                order.order_status
                              )}`}
                            >
                              {order.order_status || "Pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "profile" && (
              <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 text-xl font-bold text-[#43243b]">
                  Personal Information
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelStyle}>Full Name</label>
                    <input
                      className={inputStyle}
                      value={profileForm.full_name || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Username</label>
                    <input
                      className={`${inputStyle} bg-gray-50`}
                      value={profileForm.username || ""}
                      disabled
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Email Address</label>
                    <input
                      className={`${inputStyle} bg-gray-50`}
                      value={profileForm.email || ""}
                      disabled
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Phone Number</label>
                    <input
                      className={inputStyle}
                      value={profileForm.phone || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Country</label>
                    <input
                      className={inputStyle}
                      value={profileForm.country || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          country: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>State</label>
                    <input
                      className={inputStyle}
                      value={profileForm.state || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          state: e.target.value,
                        })
                      }
                      placeholder="Enter your state"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>City</label>
                    <input
                      className={inputStyle}
                      value={profileForm.city || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          city: e.target.value,
                        })
                      }
                      placeholder="Enter your city"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelStyle}>Delivery Address</label>
                    <textarea
                      className={inputStyle}
                      rows={3}
                      value={profileForm.delivery_address || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          delivery_address: e.target.value,
                        })
                      }
                      placeholder="Enter your delivery address"
                    />
                  </div>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="mt-6 rounded-xl bg-[#75436d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#603657] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {view === "addresses" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#43243b]">
                      Saved Addresses
                    </h2>
                    <p className="mt-1 text-sm text-[#756574]">
                      Manage your delivery addresses.
                    </p>
                  </div>

                  {!showAddressForm && (
                    <button
                      onClick={openNewAddress}
                      className="rounded-xl bg-[#75436d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#603657]"
                    >
                      Add New Address
                    </button>
                  )}
                </div>

                            {order.shipping_status || "Not shipped"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Shipping Carrier
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#43243b]">
                            {order.shipping_carrier || "Not yet assigned"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Tracking Number
                          </p>
                          <p className="mt-1 break-all text-sm font-medium text-[#43243b]">
                            {order.tracking_number || "Not yet available"}
                          </p>
                        </div>
                      </div>

                      {order.shipping_notes && (
                        <div className="mt-4 rounded-xl bg-[#fff8fc] p-4">
                          <p className="text-xs font-semibold text-[#75436d]">
                            Delivery Update
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#493a49]">
                            {order.shipping_notes}
                          </p>
                        </div>
                      )}

                      {order.payment_status?.toUpperCase() !== "PAID" &&
                        order.order_status?.toUpperCase() !== "CANCELLED" && (
                          <div className="mt-5 border-t border-[#f0e2ec] pt-4">
                            <button
                              type="button"
                              onClick={() => continuePayment(order.id)}
                              disabled={payingOrderId !== null}
                              className="w-full rounded-xl bg-gradient-to-r from-[#75436d] to-[#43243b] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              {payingOrderId === order.id
                                ? "Opening Secure Payment..."
                                : "Continue Payment"}
                            </button>
                            <p className="mt-2 text-xs text-[#756574]">
                              Complete payment for this order without placing a new order.
                            </p>
                          </div>
                        )}
                    </article>
                  ))
                )}
              </div>
            )}

            {view === "invoices" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#43243b]">
                    My Invoices
                  </h2>
                  <p className="mt-1 text-sm text-[#756574]">
                    View your invoices and payment status.
                  </p>
                </div>

                {invoices.length === 0 ? (
                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-8 text-center">
                    <p className="font-semibold text-[#43243b]">
                      No invoices available
                    </p>
                    <p className="mt-2 text-sm text-[#756574]">
                      Invoices created for your orders will appear here.
                    </p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <article
                      key={invoice.id}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#756574]">
                            Invoice Number
                          </p>
                          <h3 className="mt-1 font-bold text-[#43243b]">
                            {invoice.invoice_number}
                          </h3>
                          <p className="mt-1 text-xs text-[#756574]">
                            Created {formatDate(invoice.created_at)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            invoice.payment_status
                          )}`}
                        >
                          {invoice.payment_status}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 border-t border-[#f0e2ec] pt-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-[#756574]">
                            Invoice Type
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#43243b]">
                            {invoice.invoice_type || "Order Invoice"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Related Order
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#43243b]">
                            {orderNumberFor(invoice.order_id)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Due Date
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#43243b]">
                            {formatDate(invoice.due_date)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Invoice Amount
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#43243b]">
                            {formatMoney(invoice.amount)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={printDocument}
                        className="mt-5 rounded-xl border border-[#75436d] px-5 py-2.5 text-sm font-semibold text-[#75436d] hover:bg-[#f9edf5]"
                      >
                        Print / Save Invoice
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}

            {view === "receipts" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#43243b]">
                    My Payment Receipts
                  </h2>
                  <p className="mt-1 text-sm text-[#756574]">
                    View receipts for payments recorded by Oraia by Dara.
                  </p>
                </div>

                {receipts.length === 0 ? (
                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-8 text-center">
                    <p className="font-semibold text-[#43243b]">
                      No receipts available
                    </p>
                    <p className="mt-2 text-sm text-[#756574]">
                      Your payment receipts will appear here once your payments
                      have been confirmed.
                    </p>
                  </div>
                ) : (
                  receipts.map((receipt) => (
                    <article
                      key={receipt.id}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#756574]">
                            Receipt Number
                          </p>
                          <h3 className="mt-1 font-bold text-[#43243b]">
                            {receipt.receipt_number}
                          </h3>
                          <p className="mt-1 text-xs text-[#756574]">
                            Payment date: {formatDate(receipt.created_at)}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                          Payment Received
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 border-t border-[#f0e2ec] pt-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-[#756574]">
                            Related Order
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#43243b]">
                            {orderNumberFor(receipt.order_id)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Payment Method
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#43243b]">
                            {receipt.payment_method || "Not specified"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Payment Reference
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-[#43243b]">
                            {receipt.payment_reference || "Not provided"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#756574]">
                            Amount Paid
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#43243b]">
                            {formatMoney(receipt.amount)}
                          </p>
                        </div>
                      </div>

                      {receipt.notes && (
                        <p className="mt-4 rounded-xl bg-[#fff8fc] p-3 text-sm text-[#493a49]">
                          {receipt.notes}
                        </p>
                      )}

                      <button
                        onClick={printDocument}
                        className="mt-5 rounded-xl border border-[#75436d] px-5 py-2.5 text-sm font-semibold text-[#75436d] hover:bg-[#f9edf5]"
                      >
                        Print / Save Receipt
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

