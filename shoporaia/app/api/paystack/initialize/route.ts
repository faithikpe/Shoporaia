
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY!;

    if (!serviceKey || !paystackSecret) {
      throw new Error("Payment configuration is missing.");
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json(
        { error: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await adminClient
      .from("customer_orders")
      .select(
        "id, user_id, total_amount, currency, payment_status, customer_email, payment_reference"
      )
      .eq("id", orderId)
      .eq("user_id", userData.user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.payment_status === "PAID") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 400 }
      );
    }

    if (order.payment_reference) {
      return NextResponse.json(
        { error: "This order already has a payment reference. Please contact support." },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(order.total_amount) * 100);

    if (!Number.isFinite(amount) || amount <= 0 || order.currency !== "NGN") {
      return NextResponse.json(
        { error: "Invalid order amount or currency." },
        { status: 400 }
      );
    }

    const email = order.customer_email || userData.user.email;

    if (!email) {
      return NextResponse.json(
        { error: "An email address is required for payment." },
        { status: 400 }
      );
    }

    const reference = `ORAIA-${crypto.randomUUID()}`;

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          currency: "NGN",
          reference,
          callback_url: "https://shoporaia.ng/payment/callback",
          metadata: {
            order_id: order.id,
            customer_id: userData.user.id,
          },
        }),
      }
    );

    const paymentData = await paystackResponse.json();

    if (!paystackResponse.ok || !paymentData.status) {
      throw new Error(
        paymentData.message || "Unable to initialize payment."
      );
    }

    const { error: updateError } = await adminClient
      .from("customer_orders")
      .update({ payment_reference: reference })
      .eq("id", order.id)
      .eq("payment_status", "UNPAID");

    if (updateError) {
      throw new Error("Unable to save payment reference.");
    }

    return NextResponse.json({
      authorization_url: paymentData.data.authorization_url,
      reference,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed.",
      },
      { status: 500 }
    );
  }
}
