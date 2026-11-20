
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const secretKey = process.env.PAYSTACK_SECRET_KEY!;

    if (!secretKey) {
      throw new Error("Paystack configuration is missing.");
    }

    const { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .select(
        "id, user_id, order_number, total_amount, currency, payment_status, payment_reference, customer_name, customer_email"
      )
      .eq("payment_reference", reference)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "No order was found for this payment." },
        { status: 404 }
      );
    }

    // Verify the transaction with Paystack, including already-paid orders.
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
      transaction.amount !== expectedAmount ||
      transaction.currency !== order.currency
    ) {
      return NextResponse.json(
        { error: "Payment could not be confirmed." },
        { status: 400 }
      );
    }

    // Confirm that this Paystack transaction belongs to this order.
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

    // Update the order only if it has not already been marked as paid.
    if (order.payment_status !== "PAID") {
      const { error: updateError } = await supabase
        .from("customer_orders")
        .update({
          payment_status: "PAID",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("payment_reference", reference)
        .in("payment_status", ["UNPAID", "PENDING", "FAILED"])
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(
          "Payment was confirmed, but the order could not be updated."
        );
      }

      // Check the latest status in case another request updated it.
      const { data: latestOrder, error: latestError } = await supabase
        .from("customer_orders")
        .select("payment_status")
        .eq("id", order.id)
        .single();

      if (latestError || latestOrder?.payment_status !== "PAID") {
        throw new Error("Unable to update the order payment status.");
      }
    }

    // Check whether a receipt already exists for this payment.
    const { data: existingReceipt, error: receiptCheckError } =
      await supabase
        .from("customer_receipts")
        .select("id, receipt_number")
        .eq("payment_reference", reference)
        .maybeSingle();

    if (receiptCheckError) {
      throw new Error("Could not check the existing payment receipt.");
    }

    let receipt = existingReceipt;

    if (!receipt) {
      const receiptNumber = `ORA-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

      const { data: newReceipt, error: receiptInsertError } =
        await supabase
          .from("customer_receipts")
          .insert({
            user_id: order.user_id,
            order_id: order.id,
            receipt_number: receiptNumber,
            amount: Number(order.total_amount),
            payment_method: "Paystack",
            payment_reference: reference,
            notes: `Payment for order ${order.order_number}`,
          })
          .select("id, receipt_number")
          .single();

      if (receiptInsertError || !newReceipt) {
        throw new Error(
          "Payment is confirmed, but receipt creation failed. Please contact support."
        );
      }

      receipt = newReceipt;
    }

    return NextResponse.json({
      success: true,
      receiptNumber: receipt.receipt_number,
    });
  } catch (error) {
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
