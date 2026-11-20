"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number;
  category: string;
  origin: string;
  quantity: number;
  image_path: string | null;
  is_active: boolean;
  imageUrl?: string;
};

type PromoCode = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
};

type Customer = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: string;
  user_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  created_at: string;
  shipping_status: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipping_notes: string | null;
  shipping_fee: number;
  shipping_payment_status: string;
  shipping_payment_reference: string | null;
  shipping_paid_at: string | null;
};

type Invoice = {
  id: string;
  user_id: string;
  order_id: string | null;
  invoice_number: string;
  invoice_type: string | null;
  amount: number;
  payment_status: string;
  due_date: string | null;
  created_at: string;
};

type Receipt = {
  id: string;
  user_id: string;
  order_id: string | null;
  receipt_number: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
};

type OrderLine = {
  product_id: string;
  quantity: string;
};

type Tab =
  | "products"
  | "discounts"
  | "orders"
  | "invoices"
  | "receipts";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discount_percent: "0",
  category: "",
  origin: "In stock in Nigeria",
  quantity: "0",
};

const emptyPromoForm = {
  code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: "",
  minimum_order_amount: "0",
  starts_at: "",
  expires_at: "",
  usage_limit: "",
};

const categories = [
  "Fashion",
  "Shoes",
  "Bags",
  "Accessories",
  "Beauty & Skincare",
  "Home & Living",
  "Electronics",
  "Gadgets",
  "Personal Care",
  "Snacks & Food",
  "Other",
];

const inputStyle =
  "w-full rounded-xl border border-[#eadce6] bg-white px-4 py-3 text-sm text-[#302331] outline-none focus:border-[#75436d]";

const labelStyle = "mb-2 block text-sm font-medium text-[#43243b]";

function money(amount: number, currency = "NGN") {
  const value = Number(amount || 0);

  if (currency === "NGN" || currency === "₦") {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency} ${value.toLocaleString()}`;
}

function discountedPrice(product: Product) {
  const discount = Math.min(
    100,
    Math.max(0, Number(product.discount_percent || 0))
  );

  return Number(product.price) * (1 - discount / 100);
}

function dateText(date: string | null | undefined) {
  if (!date) return "Not set";

  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateTimeText(date: string | null | undefined) {
  if (!date) return "Not set";

  return new Date(date).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function makeReference(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function statusClass(status: string | null | undefined) {
  const value = (status || "").toLowerCase();

  if (
    value.includes("paid") ||
    value.includes("delivered") ||
    value.includes("completed") ||
    value.includes("confirmed")
  ) {
    return "bg-green-100 text-green-800";
  }

  if (
    value.includes("pending") ||
    value.includes("processing") ||
    value.includes("transit")
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (value.includes("cancelled") || value.includes("failed")) {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-700";
}

export default function AdminPage() {
  const [email, setEmail] = useState("chidinmajoy568@gmail.com");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const [tab, setTab] = useState<Tab>("products");
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [orderLines, setOrderLines] = useState<OrderLine[]>([
    { product_id: "", quantity: "1" },
  ]);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderUpdate, setOrderUpdate] = useState({
    order_status: "Pending",
    payment_status: "Pending",
    shipping_status: "Not shipped",
    tracking_number: "",
    shipping_carrier: "",
    shipping_notes: "",
    shipping_fee: "0",
  });

  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptMethod, setReceiptMethod] = useState("Bank Transfer");
  const [receiptReference, setReceiptReference] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      await verifyAdmin(data.session.user.id);
    } else {
      setChecking(false);
    }
  }

  async function verifyAdmin(userId: string) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      setLoggedIn(false);
      setMessage(
        "This account is not authorized to access the admin dashboard."
      );
      setChecking(false);
      return;
    }

    setLoggedIn(true);
    setChecking(false);
    await loadAll();
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage(error?.message || "Login failed.");
      setLoading(false);
      return;
    }

    await verifyAdmin(data.user.id);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setProducts([]);
    setOrders([]);
    setCustomers([]);
    setOrderItems([]);
    setInvoices([]);
    setReceipts([]);
    setPromoCodes([]);
    setMessage("You have logged out.");
  }

  async function loadAll() {
    await Promise.all([
      loadProducts(),
      loadCustomers(),
      loadOrders(),
      loadInvoices(),
      loadReceipts(),
      loadPromoCodes(),
    ]);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load products: " + error.message);
      return;
    }

    const items = await Promise.all(
      (data || []).map(async (product) => {
        let imageUrl = "";

        if (product.image_path) {
          const { data: signedImage } = await supabase.storage
            .from("product-images")
            .createSignedUrl(product.image_path, 3600);

          imageUrl = signedImage?.signedUrl || "";
        }

        return {
          ...product,
          discount_percent: Number(product.discount_percent || 0),
          imageUrl,
        };
      })
    );

    setProducts(items as Product[]);
  }

  async function loadPromoCodes() {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load promo codes: " + error.message);
      return;
    }

    setPromoCodes((data || []) as PromoCode[]);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("user_id, full_name, email, phone")
      .order("full_name", { ascending: true });

    if (error) {
      setMessage("Could not load customers: " + error.message);
      return;
    }

    setCustomers((data || []) as Customer[]);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("customer_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load orders: " + error.message);
      return;
    }

    const loadedOrders = (data || []) as Order[];
    setOrders(loadedOrders);

    if (loadedOrders.length > 0) {
      const { data: items, error: itemError } = await supabase
        .from("order_items")
        .select("*")
        .in(
          "order_id",
          loadedOrders.map((order) => order.id)
        );

      if (itemError) {
        setMessage("Could not load order items: " + itemError.message);
      } else {
        setOrderItems((items || []) as OrderItem[]);
      }
    } else {
      setOrderItems([]);
    }
  }

  async function loadInvoices() {
    const { data, error } = await supabase
      .from("customer_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load invoices: " + error.message);
      return;
    }

    setInvoices((data || []) as Invoice[]);
  }

  async function loadReceipts() {
    const { data, error } = await supabase
      .from("customer_receipts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load receipts: " + error.message);
      return;
    }

    setReceipts((data || []) as Receipt[]);
  }

  function resetForm() {
    setForm(emptyForm);
    setImage(null);
    setEditingId(null);

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      discount_percent: String(product.discount_percent || 0),
      category: product.category,
      origin: product.origin,
      quantity: String(product.quantity),
    });
    setImage(null);
    setMessage("");
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const discount = Number(form.discount_percent || 0);

    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setMessage("Product discount must be between 0 and 100 percent.");
      return;
    }

    if (Number(form.price) <= 0) {
      setMessage("Enter a valid product price.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let imagePath: string | null = null;

      if (image) {
        const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const fileName = `${Date.now()}-${safeName}`;

        const { data: uploaded, error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(fileName, image, { upsert: false });

        if (uploadError) throw uploadError;
        imagePath = uploaded.path;
      }

      if (editingId) {
        const currentProduct = products.find(
          (product) => product.id === editingId
        );

        const updates: Record<string, unknown> = {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          discount_percent: discount,
          category: form.category,
          origin: form.origin,
          quantity: Number(form.quantity),
          updated_at: new Date().toISOString(),
        };

        if (imagePath) updates.image_path = imagePath;

        const { error } = await supabase
          .from("products")
          .update(updates)
          .eq("id", editingId);

        if (error) throw error;

        if (imagePath && currentProduct?.image_path) {
          await supabase.storage
            .from("product-images")
            .remove([currentProduct.image_path]);
        }

        setMessage("Product updated successfully!");
      } else {
        const { error } = await supabase.from("products").insert({
          name: form.name,
          description: form.description,
          price: Number(form.price),
          discount_percent: discount,
          category: form.category,
          origin: form.origin,
          quantity: Number(form.quantity),
          image_path: imagePath,
          is_active: true,
        });

        if (error) throw error;

        setMessage("Product added successfully!");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      setMessage(
        "Error: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      if (product.image_path) {
        await supabase.storage
          .from("product-images")
          .remove([product.image_path]);
      }

      setMessage("Product deleted successfully!");
      await loadProducts();
    } catch (error) {
      setMessage(
        "Error: " +
          (error instanceof Error ? error.message : "Could not delete product.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setMessage("Could not update availability: " + error.message);
      return;
    }

    setMessage("Product availability updated.");
    await loadProducts();
  }

  function resetPromoForm() {
    setPromoForm(emptyPromoForm);
    setEditingPromoId(null);
  }

  function editPromo(promo: PromoCode) {
    setEditingPromoId(promo.id);
    setPromoForm({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: String(promo.discount_value),
      minimum_order_amount: String(promo.minimum_order_amount || 0),
      starts_at: toLocalDateTime(promo.starts_at),
      expires_at: toLocalDateTime(promo.expires_at),
      usage_limit:
        promo.usage_limit === null ? "" : String(promo.usage_limit),
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePromoCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = promoForm.code.trim().toUpperCase();
    const value = Number(promoForm.discount_value);
    const minimum = Number(promoForm.minimum_order_amount || 0);
    const usageLimit =
      promoForm.usage_limit.trim() === ""
        ? null
        : Number(promoForm.usage_limit);

    if (!code) {
      setMessage("Enter a promo code.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid discount value.");
      return;
    }

    if (promoForm.discount_type === "percentage" && value > 100) {
      setMessage("Percentage promo discounts cannot exceed 100%.");
      return;
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      setMessage("Enter a valid minimum order amount.");
      return;
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit < 1)
    ) {
      setMessage("Usage limit must be a whole number greater than zero.");
      return;
    }

    const startsAt = promoForm.starts_at
      ? new Date(promoForm.starts_at).toISOString()
      : new Date().toISOString();

    const expiresAt = promoForm.expires_at
      ? new Date(promoForm.expires_at).toISOString()
      : null;

    if (
      expiresAt &&
      new Date(expiresAt).getTime() <= new Date(startsAt).getTime()
    ) {
      setMessage("The expiry date must be after the start date.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const promoData = {
        code,
        discount_type: promoForm.discount_type,
        discount_value: value,
        minimum_order_amount: minimum,
        starts_at: startsAt,
        expires_at: expiresAt,
        usage_limit: usageLimit,
      };

      if (editingPromoId) {
        const { error } = await supabase
          .from("promo_codes")
          .update(promoData)
          .eq("id", editingPromoId);

        if (error) throw error;

        setMessage("Promo code updated successfully.");
      } else {
        const { error } = await supabase.from("promo_codes").insert({
          ...promoData,
          usage_count: 0,
          is_active: true,
        });

        if (error) {
          if (error.code === "23505") {
            throw new Error("This promo code already exists.");
          }
          throw error;
        }

        setMessage("Promo code created successfully.");
      }

      resetPromoForm();
      await loadPromoCodes();
    } catch (error) {
      setMessage(
        "Could not save promo code: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function togglePromo(promo: PromoCode) {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    if (error) {
      setMessage("Could not update promo code: " + error.message);
    } else {
      setMessage(
        promo.is_active
          ? "Promo code deactivated."
          : "Promo code activated."
      );
      await loadPromoCodes();
    }

    setLoading(false);
  }

  async function deletePromo(promo: PromoCode) {
    const confirmed = window.confirm(
      `Delete promo code "${promo.code}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", promo.id);

    if (error) {
      setMessage("Could not delete promo code: " + error.message);
    } else {
      setMessage("Promo code deleted.");
      if (editingPromoId === promo.id) resetPromoForm();
      await loadPromoCodes();
    }

    setLoading(false);
  }

  function updateOrderLine(
    index: number,
    field: keyof OrderLine,
    value: string
  ) {
    setOrderLines((previous) =>
      previous.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  }

  function addOrderLine() {
    setOrderLines((previous) => [
      ...previous,
      { product_id: "", quantity: "1" },
    ]);
  }

  function removeOrderLine(index: number) {
    setOrderLines((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, i) => i !== index)
    );
  }

  const orderTotal = orderLines.reduce((total, line) => {
    const product = products.find((item) => item.id === line.product_id);

    return (
      total +
      (product ? discountedPrice(product) : 0) *
        Number(line.quantity || 0)
    );
  }, 0);

  async function createOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedCustomer) {
      setMessage("Please select a customer.");
      return;
    }

    const validLines = orderLines.filter(
      (line) => line.product_id && Number(line.quantity) > 0
    );

    if (validLines.length === 0) {
      setMessage("Please add at least one product to this order.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const customer = customers.find(
        (item) => item.user_id === selectedCustomer
      );

      if (!customer) throw new Error("Selected customer could not be found.");

      const preparedItems = validLines.map((line) => {
        const product = products.find(
          (item) => item.id === line.product_id
        );

        if (!product) throw new Error("A selected product could not be found.");

        const quantity = Number(line.quantity);
        const unitPrice = discountedPrice(product);

        return {
          product_name: product.name,
          product_image: product.imageUrl || null,
          quantity,
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
        };
      });

      const subtotal = preparedItems.reduce(
        (sum, item) => sum + item.total_price,
        0
      );

      const orderNumber = makeReference("ORA");

      const { data: newOrder, error: orderError } = await supabase
        .from("customer_orders")
        .insert({
          user_id: selectedCustomer,
          order_number: orderNumber,
          order_status: "Pending",
          payment_status: "Pending",
          subtotal,
          total_amount: subtotal,
          currency: "NGN",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(
          preparedItems.map((item) => ({
            order_id: newOrder.id,
            ...item,
          }))
        );

      if (itemsError) {
        await supabase
          .from("customer_orders")
          .delete()
          .eq("id", newOrder.id);

        throw itemsError;
      }

      setMessage(
        `Order ${orderNumber} created for ${customer.full_name || customer.email}.`
      );
      setSelectedCustomer("");
      setOrderLines([{ product_id: "", quantity: "1" }]);
      await loadOrders();
    } catch (error) {
      setMessage(
        "Could not create order: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  function openOrderEditor(order: Order) {
    setEditingOrder(order);
    setOrderUpdate({
      order_status: order.order_status || "Pending",
      payment_status: order.payment_status || "Pending",
      shipping_status: order.shipping_status || "Not shipped",
      tracking_number: order.tracking_number || "",
      shipping_carrier: order.shipping_carrier || "",
      shipping_notes: order.shipping_notes || "",
      shipping_fee: String(order.shipping_fee || 0),
    });
  }

  async function saveOrderUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingOrder) return;

    const shippingFee = Number(orderUpdate.shipping_fee);

    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      setMessage("Enter a valid shipping fee.");
      return;
    }

    const previousFee = Number(editingOrder.shipping_fee || 0);

    if (
      editingOrder.shipping_payment_status === "Paid" &&
      shippingFee !== previousFee
    ) {
      setMessage(
        "This shipping fee has already been paid and cannot be changed."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const shippingPaymentStatus =
      shippingFee <= 0
        ? "Not required"
        : editingOrder.shipping_payment_status === "Paid"
          ? "Paid"
          : "Pending";

    const feeChanged = shippingFee !== previousFee;

    const { error } = await supabase
      .from("customer_orders")
      .update({
        order_status: orderUpdate.order_status,
        payment_status: orderUpdate.payment_status,
        shipping_status: orderUpdate.shipping_status,
        tracking_number: orderUpdate.tracking_number,
        shipping_carrier: orderUpdate.shipping_carrier,
        shipping_notes: orderUpdate.shipping_notes,
        shipping_fee: shippingFee,
        shipping_payment_status: shippingPaymentStatus,
        ...(feeChanged ? { shipping_payment_reference: null } : {}),
        update_at: new Date().toISOString(),
      })
      .eq("id", editingOrder.id);

    if (error) {
      setMessage("Could not update order: " + error.message);
    } else {
      setMessage(
        `Order ${editingOrder.order_number} updated successfully.`
      );
      setEditingOrder(null);
      await loadOrders();
    }

    setLoading(false);
  }

  function openInvoiceForm(order: Order) {
    setInvoiceOrder(order);
    setInvoiceDueDate("");
  }

  async function createInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoiceOrder) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("customer_invoices").insert({
      user_id: invoiceOrder.user_id,
      order_id: invoiceOrder.id,
      invoice_number: makeReference("INV"),
      invoice_type: "Order Invoice",
      amount: invoiceOrder.total_amount,
      payment_status: invoiceOrder.payment_status || "Pending",
      due_date: invoiceDueDate || null,
    });

    if (error) {
      setMessage("Could not create invoice: " + error.message);
    } else {
      setMessage(`Invoice created for order ${invoiceOrder.order_number}.`);
      setInvoiceOrder(null);
      await loadInvoices();
    }

    setLoading(false);
  }

  function openReceiptForm(order: Order) {
    setReceiptOrder(order);
    setReceiptAmount(String(order.total_amount));
    setReceiptMethod("Bank Transfer");
    setReceiptReference("");
    setReceiptNotes("");
  }

  async function createReceipt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!receiptOrder) return;

    const amount = Number(receiptAmount);

    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("customer_receipts").insert({
      user_id: receiptOrder.user_id,
      order_id: receiptOrder.id,
      receipt_number: makeReference("RCT"),
      amount,
      payment_method: receiptMethod,
      payment_reference: receiptReference || null,
      notes: receiptNotes || null,
    });

    if (error) {
      setMessage("Could not create receipt: " + error.message);
    } else {
      const { error: paymentError } = await supabase
        .from("customer_orders")
        .update({
          payment_status:
            amount >= Number(receiptOrder.total_amount)
              ? "Paid"
              : "Partially paid",
          update_at: new Date().toISOString(),
        })
        .eq("id", receiptOrder.id);

      if (paymentError) {
        setMessage(
          "Receipt created, but payment status could not be updated: " +
            paymentError.message
        );
      } else {
        setMessage("Payment receipt created and order payment status updated.");
      }

      setReceiptOrder(null);
      await Promise.all([loadReceipts(), loadOrders()]);
    }

    setLoading(false);
  }

  function customerName(userId: string) {
    const customer = customers.find((item) => item.user_id === userId);
    return customer?.full_name || customer?.email || "Customer";
  }

  function customerEmail(userId: string) {
    return customers.find((item) => item.user_id === userId)?.email || "";
  }

  function orderFor(orderId: string | null) {
    if (!orderId) return null;
    return orders.find((order) => order.id === orderId) || null;
  }

  function itemsFor(orderId: string) {
    return orderItems.filter((item) => item.order_id === orderId);
  }

  function printDocument() {
    window.print();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc]">
        <p className="text-[#43243b]">Checking admin access...</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fc] px-5">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-2xl border border-[#f0e2ec] bg-white p-8 shadow-sm"
        >
          <h1 className="text-3xl font-bold text-[#43243b]">
            Oraia by Dara
          </h1>
          <p className="mb-7 mt-2 text-sm text-[#756574]">Admin Login</p>

          <label className={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${inputStyle} mb-5`}
          />

          <label className={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${inputStyle} mb-5`}
          />

          {message && (
            <p className="mb-4 text-sm text-red-600">{message}</p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#75436d] p-3 font-semibold text-white hover:bg-[#603657] disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fc] px-4 py-8 text-[#302331] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#43243b]">
              Oraia by Dara
            </h1>
            <p className="mt-1 text-sm text-[#756574]">
              Admin Management Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-[#75436d] px-5 py-2.5 text-sm font-semibold text-[#75436d] hover:bg-[#f9edf5]"
          >
            Logout
          </button>
        </header>

        {message && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadce6] bg-white p-4 text-sm text-[#43243b]">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="font-semibold text-[#75436d]"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Products", products.length],
            ["Customers", customers.length],
            ["Orders", orders.length],
            ["Invoices", invoices.length],
            ["Promo Codes", promoCodes.length],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-[#f0e2ec] bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-[#756574]">{label}</p>
              <p className="mt-2 text-2xl font-bold text-[#43243b]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <nav className="mb-8 flex flex-wrap gap-2">
          {(
            [
              ["products", "Products"],
              ["discounts", "Discounts & Promo Codes"],
              ["orders", "Orders"],
              ["invoices", "Invoices"],
              ["receipts", "Receipts"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setMessage("");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                tab === key
                  ? "bg-[#75436d] text-white"
                  : "border border-[#eadce6] bg-white text-[#43243b] hover:bg-[#f9edf5]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "products" && (
          <>
            <section className="mb-10 rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-6 text-xl font-bold text-[#43243b]">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>

              <form onSubmit={saveProduct} className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelStyle}>Product Name</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                    className={inputStyle}
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className={labelStyle}>Price (₦)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    required
                    className={inputStyle}
                    placeholder="Enter price"
                  />
                </div>

                <div>
                  <label className={labelStyle}>Product Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.discount_percent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_percent: e.target.value,
                      })
                    }
                    className={inputStyle}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-[#756574]">
                    Enter 0 for no discount. Enter 20 for 20% off.
                  </p>
                  {Number(form.price) > 0 &&
                    Number(form.discount_percent) > 0 &&
                    Number(form.discount_percent) <= 100 && (
                      <p className="mt-2 text-sm font-semibold text-green-700">
                        Customer price:{" "}
                        {money(
                          Number(form.price) *
                            (1 - Number(form.discount_percent) / 100)
                        )}
                      </p>
                    )}
                </div>

                <div>
                  <label className={labelStyle}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                    className={inputStyle}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Product Origin</label>
                  <select
                    value={form.origin}
                    onChange={(e) =>
                      setForm({ ...form, origin: e.target.value })
                    }
                    className={inputStyle}
                  >
                    <option>In stock in Nigeria</option>
                    <option>China preorder</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    required
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Product Photo</label>
                  <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImage(e.target.files?.[0] || null)
                    }
                    className={inputStyle}
                  />
                  {editingId && (
                    <p className="mt-1 text-xs text-[#756574]">
                      Leave empty to keep the current photo.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className={labelStyle}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={4}
                    className={inputStyle}
                    placeholder="Describe this product..."
                  />
                </div>

                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white hover:bg-[#603657] disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : editingId
                        ? "Save Changes"
                        : "Add Product"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-[#eadce6] px-7 py-3 text-[#43243b]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#43243b]">
                  Your Products ({products.length})
                </h2>
                <button
                  onClick={loadProducts}
                  className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b]"
                >
                  Refresh Products
                </button>
              </div>

              {products.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center text-[#756574]">
                  No products added yet.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-[#f0e2ec] bg-white shadow-sm"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-56 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-56 items-center justify-center bg-[#f9edf5] text-[#75436d]">
                          No product image
                        </div>
                      )}

                      <div className="p-5">
                        <h3 className="font-bold text-[#43243b]">
                          {product.name}
                        </h3>

                        {product.discount_percent > 0 ? (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500 line-through">
                              {money(product.price)}
                            </p>
                            <p className="font-bold text-[#75436d]">
                              {money(discountedPrice(product))}
                            </p>
                            <span className="mt-1 inline-block rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-[#75436d]">
                              {product.discount_percent}% OFF
                            </span>
                          </div>
                        ) : (
                          <p className="mt-2 font-semibold text-[#302331]">
                            {money(product.price)}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-[#756574]">
                          {product.category} · {product.origin}
                        </p>
                        <p className="mt-1 text-sm text-[#756574]">
                          Quantity: {product.quantity}
                        </p>
                        <p className="mt-2 text-sm">
                          {product.is_active ? (
                            <span className="text-green-700">Active</span>
                          ) : (
                            <span className="text-red-600">Hidden</span>
                          )}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            onClick={() => startEditing(product)}
                            className="rounded-lg bg-[#75436d] px-4 py-2 text-sm text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleAvailability(product)}
                            className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm text-[#43243b]"
                          >
                            {product.is_active ? "Hide" : "Show"}
                          </button>
                          <button
                            onClick={() => deleteProduct(product)}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "discounts" && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold text-[#43243b]">
                {editingPromoId ? "Edit Promo Code" : "Create Promo Code"}
              </h2>
              <p className="mb-6 mt-2 text-sm text-[#756574]">
                Create promotional codes customers can enter when placing an
                order. You can set the discount, minimum spend, dates and usage
                limit.
              </p>

              <form onSubmit={savePromoCode} className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelStyle}>Promo Code</label>
                  <input
                    value={promoForm.code}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        code: e.target.value.toUpperCase().replace(/\s/g, ""),
                      })
                    }
                    required
                    className={inputStyle}
                    placeholder="e.g. ORAIA20"
                  />
                  <p className="mt-1 text-xs text-[#756574]">
                    Spaces are removed automatically.
                  </p>
                </div>

                <div>
                  <label className={labelStyle}>Discount Type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discount_type: e.target.value as
                          | "percentage"
                          | "fixed",
                      })
                    }
                    className={inputStyle}
                  >
                    <option value="percentage">Percentage discount (%)</option>
                    <option value="fixed">Fixed amount (₦)</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>
                    {promoForm.discount_type === "percentage"
                      ? "Discount Percentage"
                      : "Discount Amount (₦)"}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={
                      promoForm.discount_type === "percentage"
                        ? "100"
                        : undefined
                    }
                    step="0.01"
                    value={promoForm.discount_value}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discount_value: e.target.value,
                      })
                    }
                    required
                    className={inputStyle}
                    placeholder={
                      promoForm.discount_type === "percentage" ? "20" : "2000"
                    }
                  />
                </div>

                <div>
                  <label className={labelStyle}>
                    Minimum Order Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={promoForm.minimum_order_amount}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        minimum_order_amount: e.target.value,
                      })
                    }
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={promoForm.starts_at}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        starts_at: e.target.value,
                      })
                    }
                    className={inputStyle}
                  />
                  <p className="mt-1 text-xs text-[#756574]">
                    Leave blank to start immediately.
                  </p>
                </div>

                <div>
                  <label className={labelStyle}>Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={promoForm.expires_at}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        expires_at: e.target.value,
                      })
                    }
                    className={inputStyle}
                  />
                  <p className="mt-1 text-xs text-[#756574]">
                    Leave blank if the code has no expiry date.
                  </p>
                </div>

                <div>
                  <label className={labelStyle}>Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={promoForm.usage_limit}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        usage_limit: e.target.value,
                      })
                    }
                    className={inputStyle}
                    placeholder="e.g. 50"
                  />
                  <p className="mt-1 text-xs text-[#756574]">
                    Leave blank for unlimited uses.
                  </p>
                </div>

                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white hover:bg-[#603657] disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : editingPromoId
                        ? "Save Changes"
                        : "Create Promo Code"}
                  </button>

                  {editingPromoId && (
                    <button
                      type="button"
                      onClick={resetPromoForm}
                      className="rounded-xl border border-[#eadce6] px-5 py-3 text-sm text-[#43243b]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#43243b]">
                    Your Promo Codes ({promoCodes.length})
                  </h2>
                  <p className="mt-1 text-sm text-[#756574]">
                    Manage your active and inactive promotional codes.
                  </p>
                </div>

                <button
                  onClick={loadPromoCodes}
                  className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b]"
                >
                  Refresh
                </button>
              </div>

              {promoCodes.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                  You have not created any promo codes yet.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {promoCodes.map((promo) => {
                    const expired =
                      promo.expires_at &&
                      new Date(promo.expires_at).getTime() < Date.now();

                    const notStarted =
                      promo.starts_at &&
                      new Date(promo.starts_at).getTime() > Date.now();

                    const limitReached =
                      promo.usage_limit !== null &&
                      promo.usage_count >= promo.usage_limit;

                    return (
                      <article
                        key={promo.id}
                        className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#756574]">
                              Promo Code
                            </p>
                            <h3 className="mt-1 text-2xl font-bold tracking-wide text-[#43243b]">
                              {promo.code}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              !promo.is_active
                                ? "bg-gray-100 text-gray-600"
                                : expired || notStarted || limitReached
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {!promo.is_active
                              ? "Inactive"
                              : expired
                                ? "Expired"
                                : notStarted
                                  ? "Scheduled"
                                  : limitReached
                                    ? "Limit reached"
                                    : "Active"}
                          </span>
                        </div>

                        <div className="my-4 rounded-xl bg-[#f9edf5] p-4">
                          <p className="text-sm text-[#756574]">Discount</p>
                          <p className="mt-1 text-2xl font-bold text-[#75436d]">
                            {promo.discount_type === "percentage"
                              ? `${promo.discount_value}% OFF`
                              : `${money(promo.discount_value)} OFF`}
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <p>
                            <span className="text-[#756574]">Minimum spend:</span>
                            <br />
                            <strong>{money(promo.minimum_order_amount)}</strong>
                          </p>
                          <p>
                            <span className="text-[#756574]">Usage:</span>
                            <br />
                            <strong>
                              {promo.usage_count}
                              {" / "}
                              {promo.usage_limit ?? "Unlimited"}
                            </strong>
                          </p>
                          <p>
                            <span className="text-[#756574]">Starts:</span>
                            <br />
                            <strong>{dateTimeText(promo.starts_at)}</strong>
                          </p>
                          <p>
                            <span className="text-[#756574]">Expires:</span>
                            <br />
                            <strong>{dateTimeText(promo.expires_at)}</strong>
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0e2ec] pt-4">
                          <button
                            onClick={() => editPromo(promo)}
                            className="rounded-lg bg-[#75436d] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => togglePromo(promo)}
                            disabled={loading}
                            className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm text-[#43243b] disabled:opacity-50"
                          >
                            {promo.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deletePromo(promo)}
                            disabled={loading}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => GenUIcopyPromo(promo.code)}
                            className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm text-[#43243b]"
                          >
                            Copy Code
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-7">
            <section className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-2 text-xl font-bold text-[#43243b]">
                Create Customer Order
              </h2>
              <p className="mb-6 text-sm text-[#756574]">
                Select a customer and add one or more products to their order.
                Product discounts are included automatically.
              </p>

              {customers.length === 0 ? (
                <p className="rounded-xl bg-[#fff8fc] p-4 text-sm text-[#756574]">
                  No customer profiles found yet. Customers need to have a
                  profile before you can create an order for them.
                </p>
              ) : (
                <form onSubmit={createOrder} className="space-y-5">
                  <div>
                    <label className={labelStyle}>Select Customer</label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      required
                      className={inputStyle}
                    >
                      <option value="">Choose a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.user_id} value={customer.user_id}>
                          {customer.full_name || "Unnamed customer"} ·{" "}
                          {customer.email || customer.user_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-[#43243b]">
                        Products in this order
                      </h3>
                      <button
                        type="button"
                        onClick={addOrderLine}
                        className="text-sm font-semibold text-[#75436d] hover:underline"
                      >
                        + Add another product
                      </button>
                    </div>

                    <div className="space-y-3">
                      {orderLines.map((line, index) => {
                        const selectedProduct = products.find(
                          (product) => product.id === line.product_id
                        );

                        return (
                          <div
                            key={index}
                            className="grid gap-3 rounded-xl border border-[#f0e2ec] p-4 sm:grid-cols-[1fr_120px_auto]"
                          >
                            <div>
                              <label className={labelStyle}>Product</label>
                              <select
                                value={line.product_id}
                                onChange={(e) =>
                                  updateOrderLine(
                                    index,
                                    "product_id",
                                    e.target.value
                                  )
                                }
                                required
                                className={inputStyle}
                              >
                                <option value="">Select a product</option>
                                {products.map((product) => (
                                  <option
                                    key={product.id}
                                    value={product.id}
                                    disabled={!product.is_active}
                                  >
                                    {product.name} ·{" "}
                                    {money(discountedPrice(product))}
                                    {!product.is_active ? " (Hidden)" : ""}
                                  </option>
                                ))}
                              </select>

                              {selectedProduct && (
                                <div className="mt-1 text-xs text-[#756574]">
                                  {selectedProduct.discount_percent > 0 ? (
                                    <>
                                      <span className="line-through">
                                        {money(selectedProduct.price)}
                                      </span>
                                      {"  "}
                                      <strong className="text-green-700">
                                        {money(discountedPrice(selectedProduct))}
                                      </strong>
                                      {"  "}
                                      ({selectedProduct.discount_percent}% off)
                                    </>
                                  ) : (
                                    <>Unit price: {money(selectedProduct.price)}</>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className={labelStyle}>Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateOrderLine(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                required
                                className={inputStyle}
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeOrderLine(index)}
                                disabled={orderLines.length === 1}
                                className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 disabled:opacity-30"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f9edf5] p-4">
                    <span className="font-semibold text-[#43243b]">
                      Order Total
                    </span>
                    <span className="text-xl font-bold text-[#43243b]">
                      {money(orderTotal)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || products.length === 0}
                    className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white hover:bg-[#603657] disabled:opacity-50"
                  >
                    {loading ? "Creating Order..." : "Create Order"}
                  </button>
                </form>
              )}
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#43243b]">
                  All Customer Orders ({orders.length})
                </h2>
                <button
                  onClick={loadOrders}
                  className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b]"
                >
                  Refresh Orders
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                  No customer orders found.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#756574]">Order Number</p>
                          <h3 className="mt-1 font-bold text-[#43243b]">
                            {order.order_number}
                          </h3>
                          <p className="mt-2 text-sm text-[#493a49]">
                            {customerName(order.user_id)}
                          </p>
                          <p className="text-xs text-[#756574]">
                            {customerEmail(order.user_id)}
                          </p>
                          <p className="mt-1 text-xs text-[#756574]">
                            {dateText(order.created_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-[#43243b]">
                            {money(order.total_amount, order.currency)}
                          </p>
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                order.order_status
                              )}`}
                            >
                              {order.order_status}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                order.payment_status
                              )}`}
                            >
                              {order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="my-4 space-y-2 border-y border-[#f0e2ec] py-4">
                        {itemsFor(order.id).map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap justify-between gap-2 text-sm"
                          >
                            <span className="text-[#493a49]">
                              {item.product_name} × {item.quantity}
                            </span>
                            <span className="font-semibold text-[#43243b]">
                              {money(item.total_price, order.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mb-4 rounded-xl bg-[#f9edf5] p-4">
                        <p className="text-sm text-[#756574]">
                          Customer Shipping Fee
                        </p>

                        <p className="mt-1 text-xl font-bold text-[#43243b]">
                          {money(
                            Number(order.shipping_fee || 0),
                            order.currency
                          )}
                        </p>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            order.shipping_payment_status
                          )}`}
                        >
                          {order.shipping_payment_status || "Not required"}
                        </span>

                        {order.shipping_paid_at && (
                          <p className="mt-2 text-xs text-[#756574]">
                            Paid on: {dateTimeText(order.shipping_paid_at)}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        <p>
                          <span className="text-[#756574]">Shipping: </span>
                          <strong className="text-[#43243b]">
                            {order.shipping_status || "Not shipped"}
                          </strong>
                        </p>
                        <p>
                          <span className="text-[#756574]">Carrier: </span>
                          <strong className="text-[#43243b]">
                            {order.shipping_carrier || "Not assigned"}
                          </strong>
                        </p>
                        <p>
                          <span className="text-[#756574]">Tracking: </span>
                          <strong className="break-all text-[#43243b]">
                            {order.tracking_number || "Not available"}
                          </strong>
                        </p>
                      </div>

                      {order.shipping_notes && (
                        <p className="mt-3 rounded-lg bg-[#fff8fc] p-3 text-sm text-[#493a49]">
                          {order.shipping_notes}
                        </p>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0e2ec] pt-4">
                        <button
                          onClick={() => openOrderEditor(order)}
                          className="rounded-lg bg-[#75436d] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Update Order
                        </button>
                        <button
                          onClick={() => openInvoiceForm(order)}
                          className="rounded-lg border border-[#75436d] px-4 py-2 text-sm font-semibold text-[#75436d]"
                        >
                          Create Invoice
                        </button>
                        <button
                          onClick={() => openReceiptForm(order)}
                          className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700"
                        >
                          Record Payment / Receipt
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "invoices" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#43243b]">
                  All Customer Invoices ({invoices.length})
                </h2>
                <p className="mt-1 text-sm text-[#756574]">
                  Invoices created for your customers.
                </p>
              </div>
              <button
                onClick={loadInvoices}
                className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b]"
              >
                Refresh
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                No invoices created yet. You can create an invoice from an
                order.
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#756574]">Invoice Number</p>
                        <h3 className="mt-1 font-bold text-[#43243b]">
                          {invoice.invoice_number}
                        </h3>
                        <p className="mt-2 text-sm text-[#493a49]">
                          {customerName(invoice.user_id)}
                        </p>
                        <p className="text-xs text-[#756574]">
                          {customerEmail(invoice.user_id)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#43243b]">
                          {money(invoice.amount)}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            invoice.payment_status
                          )}`}
                        >
                          {invoice.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[#f0e2ec] pt-4 text-sm sm:grid-cols-3">
                      <p>
                        <span className="text-[#756574]">Order: </span>
                        <strong className="text-[#43243b]">
                          {orderFor(invoice.order_id)?.order_number ||
                            "Not linked"}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#756574]">Invoice type: </span>
                        <strong className="text-[#43243b]">
                          {invoice.invoice_type || "Order Invoice"}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#756574]">Due date: </span>
                        <strong className="text-[#43243b]">
                          {dateText(invoice.due_date)}
                        </strong>
                      </p>
                    </div>

                    <button
                      onClick={printDocument}
                      className="mt-4 rounded-lg border border-[#75436d] px-4 py-2 text-sm font-semibold text-[#75436d]"
                    >
                      Print / Save Invoices
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "receipts" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#43243b]">
                  All Customer Receipts ({receipts.length})
                </h2>
                <p className="mt-1 text-sm text-[#756574]">
                  Payments recorded and receipts issued to customers.
                </p>
              </div>
              <button
                onClick={loadReceipts}
                className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b]"
              >
                Refresh
              </button>
            </div>

            {receipts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                No receipts recorded yet. Record a payment from the Orders
                section.
              </div>
            ) : (
              <div className="space-y-4">
                {receipts.map((receipt) => (
                  <article
                    key={receipt.id}
                    className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#756574]">Receipt Number</p>
                        <h3 className="mt-1 font-bold text-[#43243b]">
                          {receipt.receipt_number}
                        </h3>
                        <p className="mt-2 text-sm text-[#493a49]">
                          {customerName(receipt.user_id)}
                        </p>
                        <p className="text-xs text-[#756574]">
                          {customerEmail(receipt.user_id)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#43243b]">
                          {money(receipt.amount)}
                        </p>
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                          Payment Received
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[#f0e2ec] pt-4 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-[#756574]">Order: </span>
                        <strong className="text-[#43243b]">
                          {orderFor(receipt.order_id)?.order_number ||
                            "Not linked"}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#756574]">Date: </span>
                        <strong className="text-[#43243b]">
                          {dateText(receipt.created_at)}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#756574]">Method: </span>
                        <strong className="text-[#43243b]">
                          {receipt.payment_method || "Not specified"}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#756574]">Reference: </span>
                        <strong className="break-all text-[#43243b]">
                          {receipt.payment_reference || "Not provided"}
                        </strong>
                      </p>
                    </div>

                    {receipt.notes && (
                      <p className="mt-3 rounded-lg bg-[#fff8fc] p-3 text-sm text-[#493a49]">
                        {receipt.notes}
                      </p>
                    )}

                    <button
                      onClick={printDocument}
                      className="mt-4 rounded-lg border border-[#75436d] px-4 py-2 text-sm font-semibold text-[#75436d]"
                    >
                      Print / Save Receipt
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={saveOrderUpdate}
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-[#43243b]">
              Update Order: {editingOrder.order_number}
            </h2>
            <p className="mb-6 mt-1 text-sm text-[#756574]">
              {customerName(editingOrder.user_id)}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border border-[#eadce6] bg-[#fff8fc] p-4">
                <label className={labelStyle}>
                  Customer Shipping Fee (₦)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyle}
                  value={orderUpdate.shipping_fee}
                  disabled={
                    editingOrder.shipping_payment_status === "Paid"
                  }
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      shipping_fee: e.target.value,
                    })
                  }
                  placeholder="Enter shipping fee"
                />

                <p className="mt-2 text-xs text-[#756574]">
                  Enter the shipping amount the customer needs to pay
                  separately. The customer will see this amount in their
                  account.
                </p>

                <p className="mt-2 text-sm font-semibold text-[#43243b]">
                  Shipping Payment Status:{" "}
                  {editingOrder.shipping_payment_status || "Not required"}
                </p>

                {editingOrder.shipping_payment_status === "Paid" && (
                  <p className="mt-1 text-xs text-green-700">
                    This shipping fee has already been paid.
                  </p>
                )}
              </div>

              <div>
                <label className={labelStyle}>Order Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.order_status}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      order_status: e.target.value,
                    })
                  }
                >
                  {[
                    "Pending",
                    "Confirmed",
                    "Processing",
                    "Completed",
                    "Cancelled",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Payment Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.payment_status}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      payment_status: e.target.value,
                    })
                  }
                >
                  {[
                    "Pending",
                    "Partially paid",
                    "Paid",
                    "Failed",
                    "Refunded",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Shipping Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.shipping_status}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      shipping_status: e.target.value,
                    })
                  }
                >
                  {[
                    "Not shipped",
                    "Preparing shipment",
                    "Shipped",
                    "In transit",
                    "Arrived in Nigeria",
                    "Out for delivery",
                    "Delivered",
                    "Delivery delayed",
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Shipping Carrier</label>
                <input
                  className={inputStyle}
                  value={orderUpdate.shipping_carrier}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      shipping_carrier: e.target.value,
                    })
                  }
                  placeholder="e.g. Skycargo"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Tracking Number</label>
                <input
                  className={inputStyle}
                  value={orderUpdate.tracking_number}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      tracking_number: e.target.value,
                    })
                  }
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Shipping / Delivery Update</label>
                <textarea
                  className={inputStyle}
                  rows={3}
                  value={orderUpdate.shipping_notes}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      shipping_notes: e.target.value,
                    })
                  }
                  placeholder="Write an update for the customer..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#75436d] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Order Updates"}
              </button>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="rounded-xl border border-[#eadce6] px-6 py-3 text-[#43243b]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={createInvoice}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-[#43243b]">
              Create Invoice
            </h2>
            <p className="mt-2 text-sm text-[#756574]">
              {invoiceOrder.order_number} · {customerName(invoiceOrder.user_id)}
            </p>

            <div className="my-5 rounded-xl bg-[#f9edf5] p-4">
              <p className="text-sm text-[#756574]">Invoice Amount</p>
              <p className="mt-1 text-2xl font-bold text-[#43243b]">
                {money(invoiceOrder.total_amount)}
              </p>
            </div>

            <label className={labelStyle}>Payment Due Date</label>
            <input
              type="date"
              className={inputStyle}
              value={invoiceDueDate}
              onChange={(e) => setInvoiceDueDate(e.target.value)}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#75436d] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Creating..." : "Generate Invoice"}
              </button>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="rounded-xl border border-[#eadce6] px-6 py-3 text-[#43243b]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={createReceipt}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-[#43243b]">
              Record Customer Payment
            </h2>
            <p className="mt-2 text-sm text-[#756574]">
              {receiptOrder.order_number} · {customerName(receiptOrder.user_id)}
            </p>

            <div className="my-5 rounded-xl bg-[#f9edf5] p-4">
              <p className="text-sm text-[#756574]">Order Total</p>
              <p className="mt-1 text-xl font-bold text-[#43243b]">
                {money(receiptOrder.total_amount)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelStyle}>Amount Received (₦)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className={inputStyle}
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                />
              </div>

              <div>
                <label className={labelStyle}>Payment Method</label>
                <select
                  className={inputStyle}
                  value={receiptMethod}
                  onChange={(e) => setReceiptMethod(e.target.value)}
                >
                  {[
                    "Bank Transfer",
                    "Paystack",
                    "Card",
                    "Cash",
                    "Other",
                  ].map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Payment Reference</label>
                <input
                  className={inputStyle}
                  value={receiptReference}
                  onChange={(e) => setReceiptReference(e.target.value)}
                  placeholder="Enter payment reference"
                />
              </div>

              <div>
                <label className={labelStyle}>Notes</label>
                <textarea
                  className={inputStyle}
                  rows={3}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Optional payment notes"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#75436d] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Saving..." : "Confirm Payment & Create Receipt"}
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="rounded-xl border border-[#eadce6] px-6 py-3 text-[#43243b]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function GenUIcopyPromo(code: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(code).catch(() => {
      window.prompt("Copy this promo code:", code);
    });
  } else if (typeof window !== "undefined") {
    window.prompt("Copy this promo code:", code);
  }
}