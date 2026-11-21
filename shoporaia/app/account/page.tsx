
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AccountView =
  | "dashboard"
  | "profile"
  | "addresses"
  | "orders"
  | "invoices"
  | "receipts"
  | "coupons"
  | "points"
  | "wishlist"
  | "recently-viewed"
  | "customer-service"
  | "policies";

type OrdersTab = "unpaid" | "processing" | "shipped" | "review";

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
  full_name: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  delivery_address: string | null;
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
  order_number: string | null;
  order_status: string | null;
  payment_status: string | null;
  shipping_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_notes: string | null;
  shipping_tracking_url?: string | null;
  shipping_dispatch_date?: string | null;
  shipping_estimated_delivery?: string | null;
  shipping_fee?: number | null;
  shipping_payment_status?: string | null;
  shipping_payment_reference?: string | null;
  shipping_paid_at?: string | null;
  subtotal: number | null;
  total_amount: number | null;
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
  invoice_number: string | null;
  invoice_type: string | null;
  amount: number | null;
  payment_status: string | null;
  due_date: string | null;
  created_at: string;
};

type CustomerReceipt = {
  id: string;
  order_id: string | null;
  receipt_number: string | null;
  amount: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
};

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

const WHATSAPP_URL =
  "https://wa.me/2349043423379?text=Hello%20Oraia%20by%20Dara%2C%20I%20need%20assistance%20with%20my%20account.";

function formatMoney(value: number | null | undefined, currency = "NGN") {
  const amount = Number(value ?? 0);

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

function statusStyle(value: string | null | undefined) {
  const status = normalizeStatus(value);

  if (
    status.includes("paid") ||
    status.includes("delivered") ||
    status.includes("completed") ||
    status.includes("success")
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    status.includes("cancel") ||
    status.includes("failed") ||
    status.includes("reject")
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    status.includes("ship") ||
    status.includes("transit") ||
    status.includes("processing")
  ) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function isPaid(order: CustomerOrder) {
  const payment = normalizeStatus(order.payment_status);

  return (
    payment === "paid" ||
    payment === "completed" ||
    payment === "success" ||
    payment === "successful"
  );
}

function isCancelled(order: CustomerOrder) {
  const status = normalizeStatus(order.order_status);

  return status.includes("cancel");
}

function getOrderTab(order: CustomerOrder): OrdersTab | null {
  if (isCancelled(order)) return null;

  const shipping = normalizeStatus(order.shipping_status);
  const orderStatus = normalizeStatus(order.order_status);

  if (!isPaid(order)) return "unpaid";

  if (
    shipping.includes("delivered") ||
    orderStatus.includes("delivered") ||
    orderStatus.includes("completed")
  ) {
    return "review";
  }

  if (
    shipping.includes("shipped") ||
    shipping.includes("transit") ||
    shipping.includes("out for delivery") ||
    shipping.includes("dispatched")
  ) {
    return "shipped";
  }

  return "processing";
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e7d5e2] bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f8] text-2xl text-[#75436d]">
        ♡
      </div>
      <h3 className="text-base font-semibold text-[#43243b]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [view, setView] = useState<AccountView>("dashboard");
  const [ordersTab, setOrdersTab] = useState<OrdersTab>("unpaid");

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
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
  const [addressForm, setAddressForm] =
    useState<AddressForm>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(
    null
  );
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

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      if (!user.email_confirmed_at) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const [
        profileResult,
        addressResult,
        orderResult,
        invoiceResult,
        receiptResult,
      ] = await Promise.all([
        supabase
          .from("customer_profiles")
          .select(
            "full_name, username, email, phone, country, state, city, delivery_address"
          )
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("customer_orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("customer_invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("customer_receipts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (addressResult.error) throw addressResult.error;
      if (orderResult.error) throw orderResult.error;
      if (invoiceResult.error) throw invoiceResult.error;
      if (receiptResult.error) throw receiptResult.error;

      const loadedProfile = profileResult.data as CustomerProfile | null;

      setProfile(loadedProfile);
      setProfileForm({
        full_name: loadedProfile?.full_name ?? "",
        username: loadedProfile?.username ?? "",
        email: loadedProfile?.email ?? user.email ?? "",
        phone: loadedProfile?.phone ?? "",
        country: loadedProfile?.country ?? "Nigeria",
        state: loadedProfile?.state ?? "",
        city: loadedProfile?.city ?? "",
        delivery_address: loadedProfile?.delivery_address ?? "",
      });

      setAddresses((addressResult.data ?? []) as CustomerAddress[]);

      const loadedOrders = (orderResult.data ?? []) as CustomerOrder[];
      setOrders(loadedOrders);

      setInvoices((invoiceResult.data ?? []) as CustomerInvoice[]);
      setReceipts((receiptResult.data ?? []) as CustomerReceipt[]);

      const orderIds = loadedOrders.map((order) => order.id);

      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("customer_order_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemsError) throw itemsError;

        const loadedItems = (items ?? []) as OrderItem[];

        const itemsWithImages = await Promise.all(
          loadedItems.map(async (item) => {
            const imagePath = item.product_image;

            if (!imagePath || imagePath.startsWith("http")) {
              return item;
            }

            const { data: signedImage } = await supabase.storage
              .from("product-images")
              .createSignedUrl(imagePath, 60 * 60);

            return {
              ...item,
              product_image: signedImage?.signedUrl ?? null,
            };
          })
        );

        setOrderItems(itemsWithImages);
      } else {
        setOrderItems([]);
      }
    } catch (err) {
      console.error("Account loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "We could not load your account. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const syncViewFromHash = () => {
      const hash = window.location.hash.replace("#", "") as AccountView;

      const allowedViews: AccountView[] = [
        "dashboard",
        "profile",
        "addresses",
        "orders",
        "invoices",
        "receipts",
        "coupons",
        "points",
        "wishlist",
        "recently-viewed",
        "customer-service",
        "policies",
      ];

      setView(allowedViews.includes(hash) ? hash : "dashboard");
    };

    syncViewFromHash();
    window.addEventListener("hashchange", syncViewFromHash);

    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, []);

  function navigate(nextView: AccountView) {
    setView(nextView);
    window.history.replaceState(null, "", `/account#${nextView}`);
    setMessage("");
    setError("");
    setShowAddressForm(false);
  }

  async function saveProfile() {
    if (!userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
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
      };

      const { error: saveError } = await supabase
        .from("customer_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (saveError) throw saveError;

      setProfile(profileForm);
      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile save error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function openNewAddress() {
    setEditingAddressId(null);
    setAddressForm({
      ...emptyAddress,
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      country: profile?.country ?? "Nigeria",
      state: profile?.state ?? "",
      city: profile?.city ?? "",
      delivery_address: profile?.delivery_address ?? "",
    });
    setShowAddressForm(true);
  }

  function openEditAddress(address: CustomerAddress) {
    setEditingAddressId(address.id);
    setAddressForm({
      full_name: address.full_name ?? "",
      phone: address.phone ?? "",
      country: address.country ?? "Nigeria",
      state: address.state ?? "",
      city: address.city ?? "",
      delivery_address: address.delivery_address ?? "",
      address_label: address.address_label ?? "Home",
      is_default: Boolean(address.is_default),
    });
    setShowAddressForm(true);
  }

  async function saveAddress() {
    if (!userId) return;

    if (
      !addressForm.full_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.delivery_address.trim()
    ) {
      setError("Please complete the name, phone number and delivery address.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (addressForm.is_default) {
        const { error: defaultError } = await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", userId);

        if (defaultError) throw defaultError;
      }

      const payload = {
        user_id: userId,
        ...addressForm,
      };

      const result = editingAddressId
        ? await supabase
            .from("customer_addresses")
            .update(payload)
            .eq("id", editingAddressId)
            .eq("user_id", userId)
        : await supabase.from("customer_addresses").insert(payload);

      if (result.error) throw result.error;

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(emptyAddress);
      setMessage("Your delivery address has been saved.");

      await loadAccount();
    } catch (err) {
      console.error("Address save error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to save this address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(addressId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this delivery address?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setMessage("Address deleted.");
      await loadAccount();
    } catch (err) {
      console.error("Address delete error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to delete this address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function setDefaultAddress(addressId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: clearError } = await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

      if (clearError) throw clearError;

      const { error: updateError } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setMessage("Default delivery address updated.");
      await loadAccount();
    } catch (err) {
      console.error("Default address error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your default address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function continuePayment(orderId: string) {
    setPayingOrderId(orderId);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (!response.ok || !result.authorization_url) {
        throw new Error(
          result.error || "Unable to continue payment. Please try again."
        );
      }

      window.location.href = result.authorization_url;
    } catch (err) {
      console.error("Payment continuation error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to continue payment."
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
    if (!orderId) return "—";

    const order = orders.find((item) => item.id === orderId);

    return order?.order_number || orderId.slice(0, 8).toUpperCase();
  }

  const orderCounts = useMemo(() => {
    const counts: Record<OrdersTab, number> = {
      unpaid: 0,
      processing: 0,
      shipped: 0,
      review: 0,
    };

    orders.forEach((order) => {
      const tab = getOrderTab(order);
      if (tab) counts[tab] += 1;
    });

    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => getOrderTab(order) === ordersTab),
    [orders, ordersTab]
  );

  const paidTotal = receipts.reduce(
    (sum, receipt) => sum + Number(receipt.amount ?? 0),
    0
  );

  const outstandingBalance = invoices.reduce((sum, invoice) => {
    if (normalizeStatus(invoice.payment_status) === "paid") return sum;

    const linkedReceipts = receipts
      .filter((receipt) => receipt.order_id === invoice.order_id)
      .reduce((receiptSum, receipt) => receiptSum + Number(receipt.amount ?? 0), 0);

    return sum + Math.max(0, Number(invoice.amount ?? 0) - linkedReceipts);
  }, 0);

  const pageTitles: Record<AccountView, string> = {
    dashboard: "My Dashboard",
    profile: "My Profile",
    addresses: "My Addresses",
    orders: "My Orders",
    invoices: "My Invoices",
    receipts: "My Receipts",
    coupons: "My Coupons",
    points: "My Points",
    wishlist: "My Wishlist",
    "recently-viewed": "Recently Viewed",
    "customer-service": "Customer Service",
    policies: "Policies",
  };

  const navButton = (
    target: AccountView,
    label: string,
    icon: string
  ) => (
    <button
      key={target}
      type="button"
      onClick={() => navigate(target)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
        view === target
          ? "bg-[#75436d] font-semibold text-white"
          : "text-[#51384d] hover:bg-[#fff0f7]"
      }`}
    >
      <span className="w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#eadce6] border-t-[#75436d]" />
          <p className="text-sm text-[#75436d]">Loading your Oraia account...</p>
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
              type="button"
              onClick={() => router.push("/")}
              className="mb-3 text-sm font-medium text-[#75436d] hover:underline"
            >
              ← Back to shopping
            </button>

            <h1 className="text-2xl font-semibold tracking-tight text-[#43243b] sm:text-3xl">
              My Account
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your Oraia orders, details and shopping activity.
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-xl border border-[#eadce6] bg-white px-5 py-2.5 text-sm font-semibold text-[#75436d] transition hover:bg-[#fff0f7]"
          >
            Sign out
          </button>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#f0e2ec] bg-white p-4 shadow-sm">
            <div className="mb-5 rounded-xl bg-[#fff4f9] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#916d88]">
                Welcome back
              </p>
              <p className="mt-1 break-words text-base font-semibold text-[#43243b]">
                {profile?.full_name || profile?.username || "Oraia customer"}
              </p>
              <p className="mt-1 break-all text-xs text-gray-500">
                {profile?.email}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  My Account
                </p>
                <div className="space-y-1">
                  {navButton("dashboard", "Dashboard", "⌂")}
                  {navButton("profile", "My Profile", "♙")}
                  {navButton("addresses", "My Addresses", "⌖")}
                  {navButton("invoices", "My Invoices", "▤")}
                  {navButton("receipts", "My Receipts", "▧")}
                </div>
              </div>

              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  My Orders
                </p>
                <div className="space-y-1">
                  {navButton("orders", "All Order Status", "▣")}
                </div>
              </div>

              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  More Services
                </p>
                <div className="space-y-1">
                  {navButton("customer-service", "Customer Service", "♡")}
                  {navButton("policies", "Policies", "☷")}
                </div>
              </div>

              <div>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  My Shopping
                </p>
                <div className="space-y-1">
                  {navButton("wishlist", "Wishlist", "♡")}
                  {navButton("recently-viewed", "Recently Viewed", "◷")}
                  {navButton("coupons", "My Coupons", "％")}
                  {navButton("points", "My Points", "✧")}
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-[#43243b]">
                {pageTitles[view]}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {view === "dashboard"
                  ? "Here is an overview of your shopping account."
                  : "Manage and view your account information."}
              </p>
            </div>

            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total Orders",
                      value: orders.length,
                      icon: "▣",
                    },
                    {
                      label: "My Coupons",
                      value: "—",
                      icon: "%",
                    },
                    {
                      label: "My Points",
                      value: "—",
                      icon: "✧",
                    },
                    {
                      label: "Saved Addresses",
                      value: addresses.length,
                      icon: "⌖",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f8] text-lg text-[#75436d]">
                        {item.icon}
                      </div>
                      <p className="text-sm text-gray-500">{item.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-[#43243b]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                    <p className="text-sm text-gray-500">
                      Outstanding Invoice Balance
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#43243b]">
                      {formatMoney(outstandingBalance)}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("invoices")}
                      className="mt-3 text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View invoices →
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                    <p className="text-sm text-gray-500">Total Payments Recorded</p>
                    <p className="mt-2 text-2xl font-semibold text-[#43243b]">
                      {formatMoney(paidTotal)}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("receipts")}
                      className="mt-3 text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View receipts →
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#43243b]">
                        My Orders
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Keep track of your recent purchases.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("orders")}
                      className="text-sm font-semibold text-[#75436d] hover:underline"
                    >
                      View all orders →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <EmptyState
                      title="No orders yet"
                      description="Your orders will appear here after you shop with Oraia."
                    />
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 4).map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0e2ec] p-4"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#43243b]">
                              Order {order.order_number || order.id.slice(0, 8)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatDate(order.created_at)}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#75436d]">
                              {formatMoney(order.total_amount, order.currency || "NGN")}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                order.payment_status
                              )}`}
                            >
                              {order.payment_status || "Pending payment"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                order.shipping_status
                              )}`}
                            >
                              {order.shipping_status || "Not shipped"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate("coupons")}
                    className="rounded-2xl border border-[#f0e2ec] bg-white p-5 text-left transition hover:border-[#d9b9d0]"
                  >
                    <span className="text-2xl text-[#75436d]">％</span>
                    <h3 className="mt-3 font-semibold text-[#43243b]">
                      My Coupons
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Check your available discounts.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("points")}
                    className="rounded-2xl border border-[#f0e2ec] bg-white p-5 text-left transition hover:border-[#d9b9d0]"
                  >
                    <span className="text-2xl text-[#75436d]">✧</span>
                    <h3 className="mt-3 font-semibold text-[#43243b]">
                      My Points
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      View your rewards information.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* PROFILE */}
            {view === "profile" && (
              <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5 sm:p-7">
                <h3 className="mb-6 font-semibold text-[#43243b]">
                  Personal Information
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelStyle}>Full Name</label>
                    <input
                      className={inputStyle}
                      value={profileForm.full_name ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Username</label>
                    <input
                      className={inputStyle}
                      value={profileForm.username ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          username: e.target.value,
                        })
                      }
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Email Address</label>
                    <input
                      className={`${inputStyle} bg-gray-50`}
                      value={profileForm.email ?? ""}
                      disabled
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Your login email cannot be changed here.
                    </p>
                  </div>

                  <div>
                    <label className={labelStyle}>Phone Number</label>
                    <input
                      className={inputStyle}
                      value={profileForm.phone ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Country</label>
                    <input
                      className={inputStyle}
                      value={profileForm.country ?? ""}
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
                      value={profileForm.state ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          state: e.target.value,
                        })
                      }
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>City</label>
                    <input
                      className={inputStyle}
                      value={profileForm.city ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          city: e.target.value,
                        })
                      }
                      placeholder="City"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelStyle}>Delivery Address</label>
                    <textarea
                      className={inputStyle}
                      rows={3}
                      value={profileForm.delivery_address ?? ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          delivery_address: e.target.value,
                        })
                      }
                      placeholder="Your delivery address"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={saveProfile}
                  className="mt-6 rounded-xl bg-[#75436d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#603657] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {/* ADDRESSES */}
            {view === "addresses" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f0e2ec] bg-white p-5">
                  <div>
                    <h3 className="font-semibold text-[#43243b]">
                      Your Delivery Addresses
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage the addresses used for your orders.
                    </p>
                  </div>

                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={openNewAddress}
                      className="rounded-xl bg-[#75436d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#603657]"
                    >
                      + Add Address
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5 sm:p-7">
                    <h3 className="mb-5 font-semibold text-[#43243b]">
                      {editingAddressId ? "Edit Address" : "Add New Address"}
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          ["full_name", "Full Name"],
                          ["phone", "Phone Number"],
                          ["country", "Country"],
                          ["state", "State"],
                          ["city", "City"],
                          ["address_label", "Address Label"],
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className={labelStyle}>{label}</label>
                          <input
                            className={inputStyle}
                            value={addressForm[field]}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                [field]: e.target.value,
                              })
                            }
                            placeholder={label}
                          />
                        </div>
                      ))}

                      <div className="sm:col-span-2">
                        <label className={labelStyle}>Full Delivery Address</label>
                        <textarea
                          className={inputStyle}
                          rows={3}
                          value={addressForm.delivery_address}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              delivery_address: e.target.value,
                            })
                          }
                          placeholder="Enter your complete delivery address"
                        />
                      </div>
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm text-[#43243b]">
                      <input
                        type="checkbox"
                        checked={addressForm.is_default}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            is_default: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#75436d]"
                      />
                      Set as my default address
                    </label>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={saveAddress}
                        className="rounded-xl bg-[#75436d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Address"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                        }}
                        className="rounded-xl border border-[#eadce6] px-5 py-3 text-sm font-semibold text-[#75436d]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {addresses.length === 0 && !showAddressForm ? (
                  <EmptyState
                    title="No saved addresses"
                    description="Add a delivery address to make your future orders easier."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className="rounded-2xl border border-[#f0e2ec] bg-white p-5"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold text-[#43243b]">
                            {address.address_label || "Address"}
                          </h3>
                          {address.is_default && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium text-[#43243b]">
                          {address.full_name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {address.phone}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {address.delivery_address}
                          <br />
                          {[address.city, address.state, address.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3 border-t border-[#f4eaf1] pt-4">
                          <button
                            type="button"
                            onClick={() => openEditAddress(address)}
                            className="text-sm font-semibold text-[#75436d] hover:underline"
                          >
                            Edit
                          </button>
                          {!address.is_default && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setDefaultAddress(address.id)}
                              className="text-sm font-semibold text-[#75436d] hover:underline"
                            >
                              Set as default
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => deleteAddress(address.id)}
                            className="text-sm font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ORDERS */}
            {view === "orders" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["unpaid", "Unpaid"],
                      ["processing", "Processing"],
                      ["shipped", "Shipped"],
                      ["review", "Review"],
                    ] as [OrdersTab, string][]
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setOrdersTab(tab)}
                      className={`rounded-xl border px-3 py-4 text-left transition ${
                        ordersTab === tab
                          ? "border-[#75436d] bg-[#75436d] text-white"
                          : "border-[#f0e2ec] bg-white text-[#43243b] hover:border-[#d9b9d0]"
                      }`}
                    >
                      <span className="block text-xs opacity-80">{label}</span>
                      <span className="mt-1 block text-xl font-semibold">
                        {orderCounts[tab]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                  <div className="mb-5">
                    <h3 className="font-semibold text-[#43243b]">
                      {ordersTab === "unpaid"
                        ? "Unpaid Orders"
                        : ordersTab === "processing"
                          ? "Processing Orders"
                          : ordersTab === "shipped"
                            ? "Shipped Orders"
                            : "Delivered Orders"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {ordersTab === "unpaid"
                        ? "Orders waiting for payment."
                        : ordersTab === "processing"
                          ? "Paid orders being prepared or processed."
                          : ordersTab === "shipped"
                            ? "Orders that have been dispatched or are in transit."
                            : "Delivered orders. The review feature is not active yet."}
                    </p>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <EmptyState
                      title={`No ${ordersTab.replace("-", " ")} orders`}
                      description="Orders in this category will appear here when available."
                    />
                  ) : (
                    <div className="space-y-5">
                      {filteredOrders.map((order) => {
                        const orderProducts = itemsForOrder(order.id);

                        return (
                          <div
                            key={order.id}
                            className="overflow-hidden rounded-xl border border-[#f0e2ec]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fff8fc] p-4">
                              <div>
                                <p className="text-sm font-semibold text-[#43243b]">
                                  Order{" "}
                                  {order.order_number ||
                                    order.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Placed {formatDate(order.created_at)}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                    order.payment_status
                                  )}`}
                                >
                                  {order.payment_status || "Pending payment"}
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                    order.shipping_status
                                  )}`}
                                >
                                  {order.shipping_status || "Not shipped"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4 p-4">
                              {orderProducts.length > 0 ? (
                                <div className="space-y-3">
                                  {orderProducts.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3"
                                    >
                                      {item.product_image ? (
                                        <img
                                          src={item.product_image}
                                          alt={item.product_name}
                                          className="h-16 w-16 rounded-lg border border-[#f0e2ec] object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#fff1f8] text-xl text-[#75436d]">
                                          ♡
                                        </div>
                                      )}

                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[#43243b]">
                                          {item.product_name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                          Qty: {item.quantity}
                                        </p>
                                      </div>

                                      <p className="text-sm font-semibold text-[#43243b]">
                                        {formatMoney(
                                          item.total_price,
                                          order.currency || "NGN"
                                        )}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  No item details are available for this order.
                                </p>
                              )}

                              <div className="rounded-xl bg-[#fff8fc] p-4">
                                <div className="flex justify-between gap-3 text-sm">
                                  <span className="text-gray-500">Subtotal</span>
                                  <span className="font-medium text-[#43243b]">
                                    {formatMoney(
                                      order.subtotal,
                                      order.currency || "NGN"
                                    )}
                                  </span>
                                </div>

                                {Number(order.shipping_fee ?? 0) > 0 && (
                                  <>
                                    <div className="mt-2 flex justify-between gap-3 text-sm">
                                      <span className="text-gray-500">
                                        Shipping Fee
                                      </span>
                                      <span className="font-medium text-[#43243b]">
                                        {formatMoney(
                                          order.shipping_fee,
                                          order.currency || "NGN"
                                        )}
                                      </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                      <span className="text-gray-500">
                                        Shipping Payment
                                      </span>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                                          order.shipping_payment_status
                                        )}`}
                                      >
                                        {order.shipping_payment_status ||
                                          "Not updated"}
                                      </span>
                                    </div>
                                  </>
                                )}

                                <div className="mt-3 flex justify-between gap-3 border-t border-[#eadce6] pt-3 text-sm">
                                  <span className="font-semibold text-[#43243b]">
                                    Order Total
                                  </span>
                                  <span className="font-bold text-[#75436d]">
                                    {formatMoney(
                                      order.total_amount,
                                      order.currency || "NGN"
                                    )}
                                  </span>
                                </div>
                              </div>

                              {(order.shipping_carrier ||
                                order.tracking_number ||
                                order.shipping_notes ||
                                order.shipping_tracking_url ||
                                order.shipping_dispatch_date ||
                                order.shipping_estimated_delivery) && (
                                <div className="rounded-xl border border-[#f0e2ec] p-4">
                                  <h4 className="mb-3 text-sm font-semibold text-[#43243b]">
                                    Shipping Information
                                  </h4>

                                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                                    {order.shipping_carrier && (
                                      <div>
                                        <p className="text-xs text-gray-500">
                                          Delivery Company
                                        </p>
                                        <p className="mt-1 font-medium text-[#43243b]">
                                          {order.shipping_carrier}
                                        </p>
                                      </div>
                                    )}

                                    {order.tracking_number && (
                                      <div>
                                        <p className="text-xs text-gray-500">
                                          Tracking Number
                                        </p>
                                        <p className="mt-1 font-medium text-[#43243b]">
                                          {order.tracking_number}
                                        </p>
                                      </div>
                                    )}

                                    {order.shipping_dispatch_date && (
                                      <div>
                                        <p className="text-xs text-gray-500">
                                          Dispatch Date
                                        </p>
                                        <p className="mt-1 font-medium text-[#43243b]">
                                          {formatDate(order.shipping_dispatch_date)}
                                        </p>
                                      </div>
                                    )}

                                    {order.shipping_estimated_delivery && (
                                      <div>
                                        <p className="text-xs text-gray-500">
                                          Estimated Delivery
                                        </p>
                                        <p className="mt-1 font-medium text-[#43243b]">
                                          {formatDate(
                                            order.shipping_estimated_delivery
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {order.shipping_notes && (
                                    <p className="mt-3 text-sm leading-6 text-gray-600">
                                      {order.shipping_notes}
                                    </p>
                                  )}

                                  {order.shipping_tracking_url && (
                                    <a
                                      href={order.shipping_tracking_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-3 inline-flex text-sm font-semibold text-[#75436d] hover:underline"
                                    >
                                      Track shipment →
                                    </a>
                                  )}
                                </div>
                              )}

                              {ordersTab === "unpaid" && !isPaid(order) && (
                                <button
                                  type="button"
                                  disabled={payingOrderId === order.id}
                                  onClick={() => continuePayment(order.id)}
                                  className="w-full rounded-xl bg-[#75436d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#603657] disabled:opacity-60 sm:w-auto"
                                >
                                  {payingOrderId === order.id
                                    ? "Redirecting to payment..."
                                    : "Continue Payment"}
                                </button>
                              )}

                              {ordersTab === "review" && (
                                <p className="rounded-xl bg-[#fff8fc] px-4 py-3 text-sm text-gray-500">
                                  Your order has been delivered. Customer
                                  reviews are not available yet.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INVOICES */}
            {view === "invoices" && (
              <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                <h3 className="mb-5 font-semibold text-[#43243b]">
                  My Invoices
                </h3>

                {invoices.length === 0 ? (
                  <EmptyState
                    title="No invoices yet"
                    description="Invoices created for your orders will appear here."
                  />
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#f0e2ec] p-4"
                      >
                        <div>
                          <p className="font-semibold text-[#43243b]">
                            {invoice.invoice_number || "Invoice"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Order: {orderNumberFor(invoice.order_id)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Issued: {formatDate(invoice.created_at)}
                          </p>
                          {invoice.due_date && (
                            <p className="mt-1 text-xs text-gray-500">
                              Due: {formatDate(invoice.due_date)}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-[#43243b]">
                            {formatMoney(invoice.amount)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                              invoice.payment_status
                            )}`}
                          >
                            {invoice.payment_status || "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RECEIPTS */}
            {view === "receipts" && (
              <div className="rounded-2xl border border-[#f0e2ec] bg-white p-5">
                <h3 className="mb-5 font-semibold text-[#43243b]">
                  My Receipts
                </h3>

                {receipts.length === 0 ? (
                  <EmptyState
                    title="No receipts yet"
                    description="Your payment receipts will appear here after payments are recorded."
                  />
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="rounded-xl border border-[#f0e2ec] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#43243b]">
                              {receipt.receipt_number || "Payment Receipt"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Order: {orderNumberFor(receipt.order_id)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatDate(receipt.created_at)}
                            </p>
                          </div>

                          <p className="font-semibold text-[#75436d]">
                            {formatMoney(receipt.amount)}
                          </p>
                        </div>

                        <div className="mt-4 grid gap-2 border-t border-[#f4eaf1] pt-3 text-sm sm:grid-cols-2">
                          <p className="text-gray-500">
                            Payment Method:{" "}
                            <span className="font-medium text-[#43243b]">
                              {receipt.payment_method || "—"}
                            </span>
                          </p>
                          <p className="text-gray-500">
                            Reference:{" "}
                            <span className="font-medium text-[#43243b]">
                              {receipt.payment_reference || "—"}
                            </span>
                          </p>
                        </div>

                        {receipt.notes && (
                          <p className="mt-2 text-sm text-gray-500">
                            {receipt.notes}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={printDocument}
                          className="mt-4 rounded-lg border border-[#eadce6] px-4 py-2 text-sm font-semibold text-[#75436d] hover:bg-[#fff8fc]"
                        >
                          Print / Save Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COUPONS */}
            {view === "coupons" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1f8] text-2xl text-[#75436d]">
                      ％
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#43243b]">
                        My Coupons
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your available discount coupons will be displayed here.
                      </p>
                    </div>
                  </div>
                </div>

                <EmptyState
                  title="No coupons available"
                  description="You don't have any coupons displayed in your account yet. When coupon rewards are activated and assigned to your account, they will appear here."
                />
              </div>
            )}

            {/* POINTS */}
            {view === "points" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1f8] text-2xl text-[#75436d]">
                      ✧
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#43243b]">
                        My Points
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your Oraia rewards information.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl bg-[#fff8fc] p-5">
                    <p className="text-sm text-gray-500">Rewards balance</p>
                    <p className="mt-1 text-3xl font-semibold text-[#43243b]">
                      Not active
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      A points balance will be displayed here once the Oraia
                      rewards programme is connected to your account.
                    </p>
                  </div>
                </div>

                <EmptyState
                  title="Rewards are not active yet"
                  description="Your points history and reward redemptions will appear here when the rewards programme is launched."
                />
              </div>
            )}

            {/* WISHLIST */}
            {view === "wishlist" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <h3 className="font-semibold text-[#43243b]">My Wishlist</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Products you save for later will be shown here.
                  </p>
                </div>

                <EmptyState
                  title="Your wishlist is empty"
                  description="The wishlist display is ready, but saving and syncing products to your account still needs to be connected."
                />
              </div>
            )}

            {/* RECENTLY VIEWED */}
            {view === "recently-viewed" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <h3 className="font-semibold text-[#43243b]">
                    Recently Viewed
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Products you have recently browsed will be shown here.
                  </p>
                </div>

                <EmptyState
                  title="No recently viewed products"
                  description="Recently viewed product tracking has not been connected yet. Your browsing history will appear here once that feature is enabled."
                />
              </div>
            )}

            {/* CUSTOMER SERVICE */}
            {view === "customer-service" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6 sm:p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f8] text-2xl text-[#75436d]">
                    ♡
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-[#43243b]">
                    How can we help you?
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                    Contact Oraia by Dara for assistance with your orders,
                    payments, delivery updates, account or shopping enquiries.
                  </p>

                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex rounded-xl bg-[#75436d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#603657]"
                  >
                    Chat with Customer Service
                  </a>
                </div>

                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <h3 className="font-semibold text-[#43243b]">
                    Before contacting us
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                    <li>• Keep your order number available.</li>
                    <li>• Include your payment reference for payment enquiries.</li>
                    <li>• Include your tracking number for delivery enquiries.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* POLICIES */}
            {view === "policies" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f0e2ec] bg-white p-6">
                  <h3 className="font-semibold text-[#43243b]">
                    Oraia Customer Policies
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Please refer to the policy information provided for your
                    specific order or preorder. If you need clarification about
                    payment, delivery, returns or refunds, contact our customer
                    service team before proceeding.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "Orders & Payments",
                      description:
                        "Contact us if you need clarification about an order, payment confirmation or invoice.",
                    },
                    {
                      title: "Shipping & Delivery",
                      description:
                        "Delivery arrangements and estimates may depend on the order and shipping method.",
                    },
                    {
                      title: "Returns & Refunds",
                      description:
                        "Contact customer service for the applicable return or refund information for your order.",
                    },
                    {
                      title: "Account Support",
                      description:
                        "Contact us if you need help with your account details or order information.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5"
                    >
                      <h4 className="font-semibold text-[#43243b]">
                        {item.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-[#fff1f8] p-5">
                  <p className="text-sm font-medium text-[#43243b]">
                    Need help understanding a policy?
                  </p>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-semibold text-[#75436d] hover:underline"
                  >
                    Contact Customer Service →
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          button,
          aside,
          header {
            display: none !important;
          }

          main {
            padding: 0 !important;
            background: white !important;
          }
        }
      `}</style>
    </main>
  );
}
