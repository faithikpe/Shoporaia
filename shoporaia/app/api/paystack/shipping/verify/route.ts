
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    const { reference } = await request.json();

    if (!reference || typeof reference !== "string") {
      return NextResponse.json(
        { error: "Payment reference is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceKey ||
      !paystackSecretKey
    ) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the transaction directly with Paystack.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackResult.status) {
      return NextResponse.json(
        { error: "Unable to verify this payment with Paystack." },
        { status: 400 }
      );
    }

    const transaction = paystackResult.data;

    if (
      transaction.status !== "success" ||
      transaction.reference !== reference
    ) {
      return NextResponse.json(
        { error: "This shipping payment was not successful." },
        { status: 400 }
      );
    }

    if (
      transaction.metadata?.payment_type !== "shipping" ||
      !transaction.metadata?.order_id ||
      transaction.metadata?.customer_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Payment details do not match this account." },
        { status: 400 }
      );
    }

    const orderId = transaction.metadata.order_id;

    // Retrieve the customer's order.
    const { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .select(
        "id, user_id, shipping_fee, shipping_payment_status, shipping_payment_reference, currency"
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Allow safe retries if this payment was already verified.
    if (
      order.shipping_payment_status === "Paid" &&
      order.shipping_payment_reference === reference
    ) {
      return NextResponse.json({
        success: true,
        message: "Shipping payment has already been confirmed.",
      });
    }

    if (order.shipping_payment_reference !== reference) {
      return NextResponse.json(
        { error: "This reference does not match the order's shipping payment." },
        { status: 400 }
      );
    }

    const expectedAmount = Math.round(Number(order.shipping_fee) * 100);

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      transaction.amount !== expectedAmount ||
      transaction.currency !== "NGN" ||
      order.currency !== "NGN"
    ) {
      return NextResponse.json(
        { error: "The payment amount or currency does not match the shipping fee." },
        { status: 400 }
      );
    }

    // Mark only the shipping payment as paid.
    const { data: updatedOrder, error: updateError } = await supabase
      .from("customer_orders")
      .update({
        shipping_payment_status: "Paid",
        shipping_payment_reference: reference,
        shipping_paid_at: new Date().toISOString(),
        update_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("shipping_payment_reference", reference)
      .neq("shipping_payment_status", "Paid")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Shipping payment update error:", updateError);

      return NextResponse.json(
        { error: "Payment was verified, but the order could not be updated." },
        { status: 500 }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "The shipping payment could not be applied to this order." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shipping payment successfully confirmed.",
    });
  } catch (error) {
    console.error("Shipping verification error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while verifying shipping payment." },
      { status: 500 }
    );
  }
}
