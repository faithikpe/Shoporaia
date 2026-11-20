"use client";

import { useEffect, useState } from "react";

export default function PaymentCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState(
    "Please wait while we confirm your payment."
  );

  useEffect(() => {
    async function verifyPayment() {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get("reference");
      const paymentType = params.get("payment_type");

      if (!reference) {
        setStatus("error");
        setMessage("We could not find your payment reference.");
        return;
      }

      const isShippingPayment = paymentType === "shipping";

      try {
        const response = await fetch(
          isShippingPayment
            ? "/api/paystack/shipping/verify"
            : "/api/paystack/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reference }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "We could not confirm your payment."
          );
        }

        setStatus("success");

        setMessage(
          isShippingPayment
            ? "Your shipping fee payment has been confirmed successfully. Thank you for shopping with Oraia by Dara."
            : "Your payment has been confirmed successfully. Thank you for shopping with Oraia by Dara."
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Please contact our support team."
        );
      }
    }

    verifyPayment();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fffafd] via-[#f9eef3] to-[#efdce7] px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 text-center shadow-[0_20px_50px_rgba(64,37,63,0.14)]">
        <h1 className="text-2xl font-bold tracking-widest text-[#40253f]">
          ORAIA BY DARA
        </h1>

        {status === "loading" && (
          <>
            <div className="mx-auto mt-10 h-12 w-12 animate-spin rounded-full border-4 border-pink-100 border-t-[#40253f]" />
            <h2 className="mt-6 text-xl font-semibold text-[#40253f]">
              Verifying Payment
            </h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-green-600">
              ✓
            </div>
            <h2 className="mt-6 text-xl font-semibold text-[#40253f]">
              Payment Successful!
            </h2>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl text-red-500">
              !
            </div>
            <h2 className="mt-6 text-xl font-semibold text-[#40253f]">
              Payment Not Confirmed
            </h2>
          </>
        )}

        <p className="mt-4 text-sm leading-7 text-gray-600">{message}</p>

        {status !== "loading" && (
          <a
            href="/account#orders"
            className="mt-8 inline-block w-full rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:-translate-y-1 hover:shadow-lg"
          >
            Go to My Orders
          </a>
        )}

        {status === "error" && (
          <a
            href="https://wa.me/2349043423379"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-[#40253f] underline underline-offset-4"
          >
            Contact Support
          </a>
        )}
      </div>
    </main>
  );
}