
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

    const { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .select("id, total_amount, currency, payment_status, payment_reference")
      .eq("payment_reference", reference)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "No order was found for this payment." },
        { status: 404 }
      );
    }

    if (order.payment_status === "PAID") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status || !result.data) {
      throw new Error("Unable to verify payment with Paystack.");
    }

    const transaction = result.data;
    const expectedAmount = Math.round(Number(order.total_amount) * 100);

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

    const { data: updatedOrder, error: updateError } = await supabase
      .from("customer_orders")
      .update({
        payment_status: "PAID",
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("payment_status", "UNPAID")
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error("Payment was confirmed, but the order could not be updated.");
    }

    if (!updatedOrder) {
      const { data: latestOrder } = await supabase
        .from("customer_orders")
        .select("payment_status")
        .eq("id", order.id)
        .single();

      if (latestOrder?.payment_status !== "PAID") {
        throw new Error("Unable to update the order payment status.");
      }
    }

    return NextResponse.json({ success: true });
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
