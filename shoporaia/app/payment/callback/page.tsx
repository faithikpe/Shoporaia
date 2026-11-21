
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your payment...");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyPayment() {
      try {
        const params = new URLSearchParams(window.location.search);

        const reference = params.get("reference");
        const paymentType = params.get("payment_type");
        const orderType = params.get("order_type");

        if (!reference) {
          throw new Error("Payment reference was not found.");
        }

        const isShippingPayment = paymentType === "shipping";

        const endpoint = isShippingPayment
          ? "/api/paystack/shipping/verify"
          : "/api/paystack/verify";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "We could not confirm your payment."
          );
        }

        if (!active) return;

        const verifiedOrderType = result.orderType || orderType;

        if (!isShippingPayment && verifiedOrderType === "dropshipper") {
          localStorage.removeItem("oraia_dropshipper_cart");
          localStorage.removeItem("oraia_dropshipper_wishlist");

          setMessage("Payment successful! Redirecting to your orders...");

          router.replace("/dropshipper/orders");
          return;
        }

        setMessage("Payment successful! Redirecting...");

        if (isShippingPayment) {
          router.replace("/account#orders");
        } else {
          router.replace("/account#orders");
        }
      } catch (err) {
        if (!active) return;

        setError(true);
        setMessage(
          err instanceof Error
            ? err.message
            : "Something went wrong while verifying your payment."
        );
      }
    }

    verifyPayment();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fff9fc] px-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        {!error ? (
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-[#40253f]" />
        ) : (
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
            !
          </div>
        )}

        <h1 className="mb-3 text-xl font-semibold text-[#40253f]">
          {error ? "Payment Verification" : "Please wait"}
        </h1>

        <p className="text-sm text-gray-600">{message}</p>

        {error && (
          <a
            href="https://wa.me/2349043423379"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-lg bg-[#40253f] px-6 py-3 text-sm font-medium text-white"
          >
            Contact Support
          </a>
        )}
      </div>
    </main>
  );
}
