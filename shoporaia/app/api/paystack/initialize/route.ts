
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");

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
    const orderType = body.orderType || "customer";

    if (
      !orderId ||
      typeof orderId !== "string" ||
      !["customer", "dropshipper"].includes(orderType)
    ) {
      return NextResponse.json(
        { error: "Invalid order information." },
        { status: 400 }
      );
    }

    const table =
      orderType === "dropshipper"
        ? "dropshipper_orders"
        : "customer_orders";

    if (orderType === "dropshipper") {
      const { data: profile, error: profileError } = await adminClient
        .from("customer_profiles")
        .select("account_type")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (profileError || profile?.account_type !== "dropshipper") {
        return NextResponse.json(
          { error: "A valid dropshipper account is required." },
          { status: 403 }
        );
      }
    }

    const { data: order, error: orderError } = await adminClient
      .from(table)
      .select(
        "id, order_number, user_id, total_amount, currency, payment_status, order_status, customer_email"
      )
      .eq("id", orderId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    const paymentStatus = String(order.payment_status || "UNPAID")
      .trim()
      .toUpperCase();

    const orderStatus = String(order.order_status || "")
      .trim()
      .toUpperCase();

    if (["PAID", "SUCCESS"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 400 }
      );
    }

    if (!["UNPAID", "PENDING", "FAILED"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "This order cannot be paid at the moment." },
        { status: 400 }
      );
    }

    if (orderStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "This order has been cancelled." },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(order.total_amount) * 100);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      String(order.currency).toUpperCase() !== "NGN"
    ) {
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

    // Save the reference before creating the Paystack transaction.
    let updateQuery = adminClient
      .from(table)
      .update({ payment_reference: reference })
      .eq("id", order.id)
      .eq("user_id", userData.user.id);

    if (order.payment_status == null) {
      updateQuery = updateQuery.is("payment_status", null);
    } else {
      updateQuery = updateQuery.eq(
        "payment_status",
        order.payment_status
      );
    }

    const { data: updatedOrder, error: updateError } =
      await updateQuery.select("id").maybeSingle();

    if (updateError || !updatedOrder) {
      throw new Error(
        "Unable to prepare your order for payment. Please refresh and try again."
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    const callbackUrl =
      `${siteUrl.replace(/\/+$/, "")}/payment/callback`;

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
            order_id: order.id,
            order_number: order.order_number,
            customer_id: userData.user.id,
            order_type: orderType,
          },
        }),
      }
    );

    const paymentData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paymentData.status ||
      !paymentData.data?.authorization_url
    ) {
      throw new Error(
        paymentData.message || "Unable to initialize payment."
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paymentData.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);

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
