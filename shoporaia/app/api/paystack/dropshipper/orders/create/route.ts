
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryPreference: string;
  customerNote?: string;
  promoCode?: string | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: NextRequest) {
  let createdOrderId: string | null = null;

  try {
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server payment configuration is incomplete." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Please log in before checking out." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your login session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("customer_profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || profile?.account_type !== "dropshipper") {
      return NextResponse.json(
        { error: "Only registered dropshipper accounts can place these orders." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CheckoutBody;

    const customerName = body.customerName?.trim();
    const customerPhone = body.customerPhone?.trim();
    const customerEmail = body.customerEmail?.trim() || user.email || "";
    const deliveryPreference = body.deliveryPreference?.trim();
    const customerNote = body.customerNote?.trim() || null;

    if (!customerName || !customerPhone || !deliveryPreference) {
      return NextResponse.json(
        {
          error:
            "Please provide your name, phone number and delivery preference.",
        },
        { status: 400 }
      );
    }

    if (
      customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Your shopping bag is empty." },
        { status: 400 }
      );
    }

    const requestedItems = new Map<string, number>();

    for (const item of body.items) {
      if (
        !item.productId ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return NextResponse.json(
          { error: "One or more items have an invalid quantity." },
          { status: 400 }
        );
      }

      requestedItems.set(
        item.productId,
        (requestedItems.get(item.productId) || 0) + item.quantity
      );
    }

    const productIds = Array.from(requestedItems.keys());

    const { data: products, error: productsError } = await supabaseAdmin
      .from("dropshipper_products")
      .select(
        "id, name, price, discount_percent, quantity, image_path, is_active"
      )
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "Some products are no longer available. Please refresh your bag.",
        },
        { status: 400 }
      );
    }

    const orderItems = [];
    let subtotal = 0;

    for (const product of products) {
      const requestedQuantity = requestedItems.get(product.id) || 0;
      const availableQuantity = Number(product.quantity || 0);

      if (requestedQuantity > availableQuantity) {
        return NextResponse.json(
          {
            error: `${product.name} does not have enough quantity available. Please update your bag.`,
          },
          { status: 400 }
        );
      }

      const price = Number(product.price);
      const discountPercent = Math.min(
        100,
        Math.max(0, Number(product.discount_percent) || 0)
      );

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: `The price for ${product.name} is invalid.` },
          { status: 400 }
        );
      }

      const unitPrice = roundMoney(
        price * (1 - discountPercent / 100)
      );

      const totalPrice = roundMoney(unitPrice * requestedQuantity);

      // Save the permanent storage path, not a temporary signed URL.
      const imagePath: string | null = product.image_path || null;

      subtotal = roundMoney(subtotal + totalPrice);

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: imagePath,
        quantity: requestedQuantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    let promoDiscount = 0;
    let promoCode: string | null = null;

    const enteredPromo = body.promoCode?.trim().toUpperCase();

    if (enteredPromo) {
      const { data: promo, error: promoError } = await supabaseAdmin
        .from("promo_codes")
        .select("*")
        .ilike("code", enteredPromo)
        .eq("is_active", true)
        .maybeSingle();

      if (promoError) {
        throw promoError;
      }

      if (!promo) {
        return NextResponse.json(
          { error: "This promo code is invalid or inactive." },
          { status: 400 }
        );
      }

      const now = new Date();

      if (promo.starts_at && new Date(promo.starts_at) > now) {
        return NextResponse.json(
          { error: "This promo code is not available yet." },
          { status: 400 }
        );
      }

      if (promo.expires_at && new Date(promo.expires_at) <= now) {
        return NextResponse.json(
          { error: "This promo code has expired." },
          { status: 400 }
        );
      }

      if (
        promo.usage_limit !== null &&
        Number(promo.usage_count) >= Number(promo.usage_limit)
      ) {
        return NextResponse.json(
          { error: "This promo code has reached its usage limit." },
          { status: 400 }
        );
      }

      if (subtotal < Number(promo.minimum_order_amount || 0)) {
        return NextResponse.json(
          {
            error:
              "Your order does not meet this promo code's minimum amount.",
          },
          { status: 400 }
        );
      }

      if (
        !["percentage", "fixed"].includes(promo.discount_type) ||
        Number(promo.discount_value) <= 0
      ) {
        return NextResponse.json(
          { error: "This promo code is not configured correctly." },
          { status: 400 }
        );
      }

      promoDiscount =
        promo.discount_type === "percentage"
          ? roundMoney(
              (subtotal * Number(promo.discount_value)) / 100
            )
          : roundMoney(
              Math.min(Number(promo.discount_value), subtotal)
            );

      promoCode = promo.code;
    }

    const finalTotal = Math.max(
      0,
      roundMoney(subtotal - promoDiscount)
    );

    const orderNumber = `ORA-D-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("dropshipper_orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        order_status: "PENDING",
        payment_status: "UNPAID",
        subtotal,
        total_amount: finalTotal,
        currency: "NGN",
        shipping_status: "PENDING",
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        delivery_preference: deliveryPreference,
        customer_note: customerNote,
        promo_code: promoCode,
        discount_amount: promoDiscount,
        order_type: "dropshipper",
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      throw orderError;
    }

    createdOrderId = order.id;

    const itemsToInsert = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("dropshipper_order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      throw itemsError;
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal,
      discountAmount: promoDiscount,
      totalAmount: finalTotal,
    });
  } catch (error) {
    if (createdOrderId) {
      await supabaseAdmin
        .from("dropshipper_order_items")
        .delete()
        .eq("order_id", createdOrderId);

      await supabaseAdmin
        .from("dropshipper_orders")
        .delete()
        .eq("id", createdOrderId);
    }

    console.error("Dropshipper order creation error:", error);

    return NextResponse.json(
      { error: "Unable to create your order. Please try again." },
      { status: 500 }
    );
  }
}
