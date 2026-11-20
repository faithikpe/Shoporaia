
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || !paystackSecret) {
      throw new Error("Payment configuration is missing.");
    }

    const authClient = createClient(supabaseUrl, anonKey);

    const {
      data: userData,
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json(
        { error: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await adminClient
      .from("customer_orders")
      .select(
        "id, order_number, user_id, currency, order_status, shipping_fee, shipping_payment_status, customer_email"
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

    const orderStatus = String(order.order_status || "")
      .trim()
      .toUpperCase();

    if (orderStatus === "CANCELLED" || orderStatus === "CANCELED") {
      return NextResponse.json(
        { error: "This order has been cancelled." },
        { status: 400 }
      );
    }

    const shippingStatus = String(
      order.shipping_payment_status || ""
    )
      .trim()
      .toLowerCase();

    if (shippingStatus === "paid") {
      return NextResponse.json(
        { error: "The shipping fee has already been paid." },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(order.shipping_fee) * 100);

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      String(order.currency || "NGN").toUpperCase() !== "NGN"
    ) {
      return NextResponse.json(
        { error: "Invalid shipping fee or currency." },
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

    const reference = `ORAIA-SHIP-${crypto.randomUUID()}`;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    const callbackUrl = `${siteUrl.replace(/\/$/, "")}/payment/callback?payment_type=shipping`;

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
          callback_url: callbackUrl,
          metadata: {
            payment_type: "shipping",
            order_id: order.id,
            order_number: order.order_number,
            customer_id: userData.user.id,
          },
        }),
      }
    );

    const paymentData = await paystackResponse.json();

    if (!paystackResponse.ok || !paymentData.status) {
      throw new Error(
        paymentData.message || "Unable to initialize shipping payment."
      );
    }

    const { data: updatedOrder, error: updateError } = await adminClient
      .from("customer_orders")
      .update({
        shipping_payment_reference: reference,
        shipping_payment_status: "Pending",
      })
      .eq("id", order.id)
      .eq("user_id", userData.user.id)
      .neq("shipping_payment_status", "Paid")
      .select("id")
      .maybeSingle();

    if (updateError || !updatedOrder) {
      throw new Error(
        "Unable to save shipping payment reference. Please refresh and try again."
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paymentData.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Shipping payment initialization error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shipping payment initialization failed.",
      },
      { status: 500 }
    );
  }
}
