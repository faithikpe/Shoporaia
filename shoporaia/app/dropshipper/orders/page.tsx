
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  created_at: string;
  shipping_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_tracking_url: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_preference: string | null;
  customer_note: string | null;
  discount_amount: number | null;
  promo_code: string | null;
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

type Receipt = {
  id: string;
  order_id: string;
  receipt_number: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string;
  notes: string | null;
  created_at: string;
};

function formatMoney(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status: string | null | undefined) {
  const value = (status || "").toUpperCase();

  if (
    value === "PAID" ||
    value === "DELIVERED" ||
    value === "COMPLETED"
  ) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (
    value === "UNPAID" ||
    value === "PENDING" ||
    value === "PROCESSING"
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (
    value === "CANCELLED" ||
    value === "FAILED" ||
    value === "REFUNDED"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

// Supports permanent storage paths and old Supabase signed image URLs.
async function getFreshProductImage(
  imageValue: string | null
): Promise<string | null> {
  if (!imageValue) return null;

  let imagePath = imageValue;

  if (/^https?:\/\//i.test(imageValue)) {
    try {
      const imageUrl = new URL(imageValue);

      const signedMarker =
        "/storage/v1/object/sign/product-images/";

      const publicMarker =
        "/storage/v1/object/public/product-images/";

      let marker = "";

      if (imageUrl.pathname.includes(signedMarker)) {
        marker = signedMarker;
      } else if (imageUrl.pathname.includes(publicMarker)) {
        marker = publicMarker;
      } else {
        // Keep external images unchanged.
        return imageValue;
      }

      const markerIndex = imageUrl.pathname.indexOf(marker);

      imagePath = decodeURIComponent(
        imageUrl.pathname.slice(markerIndex + marker.length)
      );
    } catch {
      return null;
    }
  }

  if (!imagePath) return null;

  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUrl(imagePath, 3600);

  if (error || !data?.signedUrl) {
    console.error("Unable to refresh product image:", error);
    return null;
  }

  return data.signedUrl;
}

export default function DropshipperOrdersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "receipts">(
    "orders"
  );
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        router.replace("/dropshipper/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("account_type")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.account_type !== "dropshipper"
      ) {
        await supabase.auth.signOut();
        router.replace("/dropshipper/login");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("dropshipper_orders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const customerOrders = (orderData || []) as Order[];
      setOrders(customerOrders);

      const orderIds = customerOrders.map((order) => order.id);

      if (orderIds.length > 0) {
        const { data: itemData, error: itemError } = await supabase
          .from("dropshipper_order_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemError) throw itemError;

        const formattedItems = await Promise.all(
          ((itemData || []) as OrderItem[]).map(async (item) => {
            const freshImage = await getFreshProductImage(
              item.product_image
            );

            return {
              ...item,
              product_image: freshImage,
            };
          })
        );

        setItems(formattedItems);
      } else {
        setItems([]);
      }

      const { data: receiptData, error: receiptError } = await supabase
        .from("dropshipper_receipts")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (receiptError) throw receiptError;

      setReceipts((receiptData || []) as Receipt[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your orders. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function itemsForOrder(orderId: string) {
    return items.filter((item) => item.order_id === orderId);
  }

  function orderForReceipt(orderId: string) {
    return orders.find((order) => order.id === orderId);
  }

  function printReceipt(receipt: Receipt) {
    const order = orderForReceipt(receipt.order_id);

    const receiptWindow = window.open("", "_blank", "width=750,height=800");

    if (!receiptWindow) {
      setError("Please allow pop-ups to print your receipt.");
      return;
    }

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${receipt.receipt_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #40253f;
              padding: 40px;
              max-width: 650px;
              margin: auto;
            }
            .brand {
              text-align: center;
              border-bottom: 1px solid #eadce6;
              padding-bottom: 25px;
            }
            .brand h1 {
              letter-spacing: 6px;
              margin-bottom: 5px;
            }
            .brand p {
              color: #9a7891;
              font-size: 11px;
              letter-spacing: 3px;
            }
            h2 { margin-top: 30px; }
            .line {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 12px 0;
              border-bottom: 1px solid #f0e5ed;
              font-size: 14px;
            }
            .total {
              font-size: 20px;
              font-weight: bold;
              margin-top: 15px;
            }
            .footer {
              margin-top: 45px;
              text-align: center;
              color: #9a7891;
              font-size: 12px;
            }
            @media print {
              body { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="brand">
            <h1>ORAIA</h1>
            <p>BY DARA</p>
            <p>PAYMENT RECEIPT</p>
          </div>

          <h2>Payment Confirmation</h2>

          <div class="line">
            <span>Receipt Number</span>
            <strong>${receipt.receipt_number}</strong>
          </div>

          <div class="line">
            <span>Order Number</span>
            <strong>${order?.order_number || "N/A"}</strong>
          </div>

          <div class="line">
            <span>Date</span>
            <strong>${formatDate(receipt.created_at)}</strong>
          </div>

          <div class="line">
            <span>Payment Method</span>
            <strong>${receipt.payment_method || "Paystack"}</strong>
          </div>

          <div class="line">
            <span>Payment Reference</span>
            <strong>${receipt.payment_reference}</strong>
          </div>

          <div class="line total">
            <span>Amount Paid</span>
            <strong>${formatMoney(receipt.amount)}</strong>
          </div>

          <div class="footer">
            <p>Thank you for shopping with Oraia by Dara.</p>
            <p>This receipt confirms a recorded payment.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcf7fa]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-[#40253f]" />
          <p className="mt-4 text-sm text-[#40253f]">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcf7fa] px-4 py-8 text-[#40253f] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dropshipper")}
              className="mb-4 text-sm font-medium text-[#805675] hover:underline"
            >
              ← Back to Dropshipper Store
            </button>

            <h1 className="text-3xl font-bold">My Orders & Receipts</h1>

            <p className="mt-2 text-sm text-[#806f7e]">
              View your dropshipper purchases and confirmed payments.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm font-semibold text-[#40253f] shadow-sm hover:bg-[#f9eef3]"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="mt-3 text-3xl font-bold">{orders.length}</p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Paid Orders</p>
            <p className="mt-3 text-3xl font-bold">
              {
                orders.filter(
                  (order) =>
                    order.payment_status?.toUpperCase() === "PAID"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Payment Receipts</p>
            <p className="mt-3 text-3xl font-bold">{receipts.length}</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl border border-pink-100 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "orders"
                ? "bg-[#40253f] text-white"
                : "text-[#725b70] hover:bg-[#fcf7fa]"
            }`}
          >
            My Orders ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
              activeTab === "receipts"
                ? "bg-[#40253f] text-white"
                : "text-[#725b70] hover:bg-[#fcf7fa]"
            }`}
          >
            My Receipts ({receipts.length})
          </button>
        </div>

        {activeTab === "orders" && (
          <section className="space-y-5">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-pink-100 bg-white px-5 py-16 text-center shadow-sm">
                <h2 className="text-lg font-semibold">No orders yet</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Your dropshipper orders will appear here after checkout.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dropshipper")}
                  className="mt-6 rounded-full bg-[#40253f] px-6 py-3 text-sm font-semibold text-white"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map((order) => {
                const orderItems = itemsForOrder(order.id);
                const isExpanded = expandedOrder === order.id;

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Order Number
                          </p>
                          <h2 className="mt-1 font-bold">
                            {order.order_number}
                          </h2>
                          <p className="mt-2 text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                              order.payment_status
                            )}`}
                          >
                            {order.payment_status}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                              order.order_status
                            )}`}
                          >
                            {order.order_status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 border-t border-pink-50 pt-5 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-gray-500">Order Total</p>
                          <p className="mt-1 text-lg font-bold">
                            {formatMoney(
                              Number(order.total_amount),
                              order.currency || "NGN"
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Shipping Status
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {order.shipping_status || "Not updated"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Items</p>
                          <p className="mt-1 text-sm font-semibold">
                            {orderItems.reduce(
                              (total, item) =>
                                total + Number(item.quantity),
                              0
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrder(
                              isExpanded ? null : order.id
                            )
                          }
                          className="rounded-full border border-[#40253f] px-5 py-2.5 text-xs font-semibold text-[#40253f] hover:bg-[#fcf7fa]"
                        >
                          {isExpanded
                            ? "Hide Details"
                            : "View Order Details"}
                        </button>

                        {order.payment_status?.toUpperCase() ===
                          "UNPAID" && (
                          <button
                            type="button"
                            onClick={() => router.push("/dropshipper")}
                            className="rounded-full bg-[#40253f] px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Return to Store
                          </button>
                        )}
                      </div>

                      {order.tracking_number && (
                        <div className="mt-5 rounded-xl bg-[#fcf7fa] p-4">
                          <p className="text-xs text-gray-500">
                            Tracking Information
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {order.shipping_carrier || "Carrier"}:{" "}
                            {order.tracking_number}
                          </p>

                          {order.shipping_tracking_url && (
                            <a
                              href={order.shipping_tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-[#805675] underline"
                            >
                              Track Shipment
                            </a>
                          )}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="mt-6 border-t border-pink-100 pt-5">
                          <h3 className="mb-4 text-sm font-bold">
                            Order Items
                          </h3>

                          {orderItems.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No item details found for this order.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {orderItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3"
                                >
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#fcf7fa]">
                                    {item.product_image && (
                                      <img
                                        src={item.product_image}
                                        alt={item.product_name}
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">
                                      {item.product_name}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.quantity} ×{" "}
                                      {formatMoney(Number(item.unit_price))}
                                    </p>
                                  </div>

                                  <p className="text-sm font-semibold">
                                    {formatMoney(Number(item.total_price))}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-5 space-y-2 border-t border-pink-100 pt-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Subtotal</span>
                              <span>
                                {formatMoney(Number(order.subtotal))}
                              </span>
                            </div>

                            {Number(order.discount_amount) > 0 && (
                              <div className="flex justify-between text-green-700">
                                <span>
                                  Discount{" "}
                                  {order.promo_code
                                    ? `(${order.promo_code})`
                                    : ""}
                                </span>
                                <span>
                                  -
                                  {formatMoney(
                                    Number(order.discount_amount)
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between border-t border-pink-100 pt-3 font-bold">
                              <span>Total</span>
                              <span>
                                {formatMoney(
                                  Number(order.total_amount),
                                  order.currency || "NGN"
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 rounded-xl bg-[#fcf7fa] p-4 text-xs sm:grid-cols-2">
                            <div>
                              <p className="text-gray-500">Customer</p>
                              <p className="mt-1 font-semibold">
                                {order.customer_name || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">Phone</p>
                              <p className="mt-1 font-semibold">
                                {order.customer_phone || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">
                                Delivery Preference
                              </p>
                              <p className="mt-1 font-semibold">
                                {order.delivery_preference || "Not provided"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500">Customer Note</p>
                              <p className="mt-1 font-semibold">
                                {order.customer_note || "None"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}

        {activeTab === "receipts" && (
          <section className="space-y-5">
            {receipts.length === 0 ? (
              <div className="rounded-2xl border border-pink-100 bg-white px-5 py-16 text-center shadow-sm">
                <h2 className="text-lg font-semibold">
                  No payment receipts yet
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Your receipts will appear here after payments are confirmed.
                </p>
              </div>
            ) : (
              receipts.map((receipt) => {
                const order = orderForReceipt(receipt.order_id);

                return (
                  <article
                    key={receipt.id}
                    className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-gray-500">
                          Receipt Number
                        </p>
                        <h2 className="mt-1 font-bold">
                          {receipt.receipt_number}
                        </h2>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatDate(receipt.created_at)}
                        </p>
                      </div>

                      <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                        Payment Confirmed
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-pink-50 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-500">Amount Paid</p>
                        <p className="mt-1 text-xl font-bold">
                          {formatMoney(Number(receipt.amount))}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Order Number</p>
                        <p className="mt-1 text-sm font-semibold">
                          {order?.order_number || "Order"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Payment Method
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {receipt.payment_method || "Paystack"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Payment Reference
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold">
                          {receipt.payment_reference}
                        </p>
                      </div>
                    </div>

                    {receipt.notes && (
                      <p className="mt-4 text-xs text-gray-500">
                        {receipt.notes}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => printReceipt(receipt)}
                      className="mt-5 rounded-full bg-[#40253f] px-6 py-3 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Print / Save Receipt
                    </button>
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>
    </main>
  );
}