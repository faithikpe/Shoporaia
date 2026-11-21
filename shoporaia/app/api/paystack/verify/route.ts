
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference || typeof reference !== "string") {
      return NextResponse.json(
        { error: "Payment reference is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !serviceKey || !secretKey) {
      throw new Error("Payment configuration is missing.");
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let orderType: "customer" | "dropshipper" = "customer";

    let { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .select(
        "id, user_id, order_number, total_amount, currency, payment_status, payment_reference, customer_name, customer_email"
      )
      .eq("payment_reference", reference)
      .maybeSingle();

    if (orderError) {
      throw new Error("Unable to find the payment order.");
    }

    if (!order) {
      const dropshipperResult = await supabase
        .from("dropshipper_orders")
        .select(
          "id, user_id, order_number, total_amount, currency, payment_status, payment_reference, customer_name, customer_email"
        )
        .eq("payment_reference", reference)
        .maybeSingle();

      if (dropshipperResult.error) {
        throw new Error("Unable to find the payment order.");
      }

      order = dropshipperResult.data;
      orderType = "dropshipper";
    }

    if (!order) {
      return NextResponse.json(
        { error: "No order was found for this payment." },
        { status: 404 }
      );
    }

    const ordersTable =
      orderType === "dropshipper"
        ? "dropshipper_orders"
        : "customer_orders";

    const receiptsTable =
      orderType === "dropshipper"
        ? "dropshipper_receipts"
        : "customer_receipts";

    // Verify the transaction directly with Paystack.
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status || !result.data) {
      throw new Error("Unable to verify payment with Paystack.");
    }

    const transaction = result.data;

    const expectedAmount = Math.round(
      Number(order.total_amount) * 100
    );

    if (
      transaction.status !== "success" ||
      transaction.reference !== reference ||
      Number(transaction.amount) !== expectedAmount ||
      transaction.currency !== order.currency
    ) {
      return NextResponse.json(
        { error: "Payment could not be confirmed." },
        { status: 400 }
      );
    }

    // Confirm that the transaction belongs to this order.
    const metadata = transaction.metadata || {};

    if (
      metadata.order_id &&
      String(metadata.order_id) !== String(order.id)
    ) {
      return NextResponse.json(
        { error: "Payment does not match this order." },
        { status: 400 }
      );
    }

    if (
      metadata.order_type &&
      metadata.order_type !== orderType
    ) {
      return NextResponse.json(
        { error: "Payment order type does not match." },
        { status: 400 }
      );
    }

    // Confirm dropshipper account type.
    if (orderType === "dropshipper") {
      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("account_type")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (profileError || profile?.account_type !== "dropshipper") {
        return NextResponse.json(
          { error: "This order does not belong to a valid dropshipper." },
          { status: 403 }
        );
      }
    }

    // Update the order only if it has not already been paid.
    const currentPaymentStatus = String(
      order.payment_status || ""
    ).toUpperCase();

    if (!["PAID", "SUCCESS"].includes(currentPaymentStatus)) {
      const { error: updateError } = await supabase
        .from(ordersTable)
        .update({
          payment_status: "PAID",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("payment_reference", reference)
        .in("payment_status", ["UNPAID", "PENDING", "FAILED"]);

      if (updateError) {
        throw new Error(
          "Payment was confirmed, but the order could not be updated."
        );
      }
    }

    // Confirm that the order is now marked as paid.
    const { data: latestOrder, error: latestError } = await supabase
      .from(ordersTable)
      .select("payment_status")
      .eq("id", order.id)
      .eq("payment_reference", reference)
      .maybeSingle();

    if (
      latestError ||
      !["PAID", "SUCCESS"].includes(
        String(latestOrder?.payment_status || "").toUpperCase()
      )
    ) {
      throw new Error("Unable to confirm the order payment status.");
    }

    // Check whether a receipt already exists.
    const { data: existingReceipt, error: receiptCheckError } =
      await supabase
        .from(receiptsTable)
        .select("id, receipt_number")
        .eq("payment_reference", reference)
        .maybeSingle();

    if (receiptCheckError) {
      throw new Error("Could not check the existing payment receipt.");
    }

    let receipt = existingReceipt;

    // Create a receipt only when one does not already exist.
    if (!receipt) {
      const receiptNumber = `ORA-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const { data: newReceipt, error: receiptInsertError } =
        await supabase
          .from(receiptsTable)
          .insert({
            user_id: order.user_id,
            order_id: order.id,
            receipt_number: receiptNumber,
            amount: Number(order.total_amount),
            payment_method: "Paystack",
            payment_reference: reference,
            notes: `Payment for ${orderType} order ${order.order_number}`,
          })
          .select("id, receipt_number")
          .single();

      if (receiptInsertError || !newReceipt) {
        // A simultaneous verification may have created the receipt.
        const { data: duplicateReceipt, error: duplicateError } =
          await supabase
            .from(receiptsTable)
            .select("id, receipt_number")
            .eq("payment_reference", reference)
            .maybeSingle();

        if (duplicateError || !duplicateReceipt) {
          throw new Error(
            "Payment is confirmed, but receipt creation failed. Please contact support."
          );
        }

        receipt = duplicateReceipt;
      } else {
        receipt = newReceipt;
      }
    }

    return NextResponse.json({
      success: true,
      receiptNumber: receipt.receipt_number,
      orderType,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}
