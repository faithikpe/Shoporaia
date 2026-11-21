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
  shipping_tracking_url: string | null;
  shipping_dispatch_date: string | null;
  shipping_estimated_delivery: string | null;
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
  | "dropshipper"
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

function discountedPrice(product: Product) {
  const discount = Math.min(
    100,
    Math.max(0, Number(product.discount_percent || 0))
  );
  return Number(product.price) * (1 - discount / 100);
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
  )
    return "bg-green-100 text-green-800";

  if (
    value.includes("pending") ||
    value.includes("processing") ||
    value.includes("transit")
  )
    return "bg-amber-100 text-amber-800";

  if (value.includes("cancelled") || value.includes("failed"))
    return "bg-red-100 text-red-800";

  return "bg-gray-100 text-gray-700";
}

export default function AdminPage() {
  const [email, setEmail] = useState("chidinmajoy568@gmail.com");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [dropshipperProducts, setDropshipperProducts] = useState<Product[]>([]);
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

  const [dropshipperForm, setDropshipperForm] = useState(emptyForm);
  const [dropshipperImage, setDropshipperImage] = useState<File | null>(null);
  const [editingDropshipperId, setEditingDropshipperId] = useState<
    string | null
  >(null);

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
    shipping_tracking_url: "",
    shipping_dispatch_date: "",
    shipping_estimated_delivery: "",
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
      setMessage("This account is not authorized to access the admin dashboard.");
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
    setDropshipperProducts([]);
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
      loadDropshipperProducts(),
      loadCustomers(),
      loadOrders(),
      loadInvoices(),
      loadReceipts(),
      loadPromoCodes(),
    ]);
  }

  async function loadProductImages(rows: any[]): Promise<Product[]> {
    return Promise.all(
      (rows || []).map(async (product) => {
        let imageUrl = "";

        if (product.image_path) {
          const { data } = await supabase.storage
            .from("product-images")
            .createSignedUrl(product.image_path, 3600);

          imageUrl = data?.signedUrl || "";
        }

        return {
          ...product,
          price: Number(product.price || 0),
          discount_percent: Number(product.discount_percent || 0),
          quantity: Number(product.quantity || 0),
          imageUrl,
        } as Product;
      })
    );
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

    setProducts(await loadProductImages(data || []));
  }

  async function loadDropshipperProducts() {
    const { data, error } = await supabase
      .from("dropshipper_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load dropshipper products: " + error.message);
      return;
    }

    setDropshipperProducts(await loadProductImages(data || []));
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

    if (loadedOrders.length) {
      const { data: items, error: itemError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", loadedOrders.map((order) => order.id));

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

  function resetProductForm() {
    setForm(emptyForm);
    setImage(null);
    setEditingId(null);

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  function resetDropshipperForm() {
    setDropshipperForm(emptyForm);
    setDropshipperImage(null);
    setEditingDropshipperId(null);

    const fileInput = document.getElementById(
      "dropshipper-product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  async function uploadProductImage(file: File, folder: string) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const fileName = `${folder}/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;
    return data.path;
  }

  function validateProductForm(values: typeof emptyForm) {
    const discount = Number(values.discount_percent || 0);

    if (!values.name.trim()) throw new Error("Enter a product name.");
    if (!values.category) throw new Error("Select a product category.");
    if (!Number.isFinite(Number(values.price)) || Number(values.price) <= 0)
      throw new Error("Enter a valid product price.");
    if (!Number.isFinite(discount) || discount < 0 || discount > 100)
      throw new Error("Product discount must be between 0 and 100 percent.");
    if (!Number.isInteger(Number(values.quantity)) || Number(values.quantity) < 0)
      throw new Error("Quantity must be a whole number of zero or more.");

    return discount;
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const discount = validateProductForm(form);
      let imagePath: string | null = null;

      if (image) imagePath = await uploadProductImage(image, "products");

      if (editingId) {
        const current = products.find((p) => p.id === editingId);

        const updates: Record<string, unknown> = {
          name: form.name.trim(),
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

        if (imagePath && current?.image_path) {
          await supabase.storage.from("product-images").remove([current.image_path]);
        }

        setMessage("Product updated successfully!");
      } else {
        const { error } = await supabase.from("products").insert({
          name: form.name.trim(),
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

      resetProductForm();
      await loadProducts();
    } catch (error) {
      setMessage("Error: " + (error instanceof Error ? error.message : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  function editProduct(product: Product) {
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
    setTab("products");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setMessage("Could not delete product: " + error.message);
    } else {
      if (product.image_path) {
        await supabase.storage.from("product-images").remove([product.image_path]);
      }
      setMessage("Product deleted successfully.");
      await loadProducts();
    }

    setLoading(false);
  }

  async function toggleProduct(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) setMessage("Could not update product: " + error.message);
    else {
      setMessage("Product availability updated.");
      await loadProducts();
    }
  }

  async function saveDropshipperProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const discount = validateProductForm(dropshipperForm);
      let imagePath: string | null = null;

      if (dropshipperImage) {
        imagePath = await uploadProductImage(dropshipperImage, "dropshipper");
      }

      if (editingDropshipperId) {
        const current = dropshipperProducts.find(
          (p) => p.id === editingDropshipperId
        );

        const updates: Record<string, unknown> = {
          name: dropshipperForm.name.trim(),
          description: dropshipperForm.description,
          price: Number(dropshipperForm.price),
          discount_percent: discount,
          category: dropshipperForm.category,
          origin: dropshipperForm.origin,
          quantity: Number(dropshipperForm.quantity),
          updated_at: new Date().toISOString(),
        };

        if (imagePath) updates.image_path = imagePath;

        const { error } = await supabase
          .from("dropshipper_products")
          .update(updates)
          .eq("id", editingDropshipperId);

        if (error) throw error;

        if (imagePath && current?.image_path) {
          await supabase.storage.from("product-images").remove([current.image_path]);
        }

        setMessage("Dropshipper product updated successfully.");
      } else {
        const { error } = await supabase.from("dropshipper_products").insert({
          name: dropshipperForm.name.trim(),
          description: dropshipperForm.description,
          price: Number(dropshipperForm.price),
          discount_percent: discount,
          category: dropshipperForm.category,
          origin: dropshipperForm.origin,
          quantity: Number(dropshipperForm.quantity),
          image_path: imagePath,
          is_active: true,
        });

        if (error) throw error;
        setMessage("Dropshipper product added successfully.");
      }

      resetDropshipperForm();
      await loadDropshipperProducts();
    } catch (error) {
      setMessage(
        "Could not save dropshipper product: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  function editDropshipperProduct(product: Product) {
    setEditingDropshipperId(product.id);
    setDropshipperForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      discount_percent: String(product.discount_percent || 0),
      category: product.category,
      origin: product.origin,
      quantity: String(product.quantity),
    });
    setDropshipperImage(null);
    setMessage("");
    setTab("dropshipper");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteDropshipperProduct(product: Product) {
    if (!window.confirm(`Delete dropshipper product "${product.name}"?`)) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("dropshipper_products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setMessage("Could not delete dropshipper product: " + error.message);
    } else {
      if (product.image_path) {
        await supabase.storage.from("product-images").remove([product.image_path]);
      }
      setMessage("Dropshipper product deleted.");
      await loadDropshipperProducts();
    }

    setLoading(false);
  }

  async function toggleDropshipperProduct(product: Product) {
    const { error } = await supabase
      .from("dropshipper_products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setMessage("Could not update dropshipper product: " + error.message);
    } else {
      setMessage("Dropshipper product availability updated.");
      await loadDropshipperProducts();
    }
  }

  function resetPromoForm() {
    setPromoForm(emptyPromoForm);
    setEditingPromoId(null);
  }

  function editPromo(promo: PromoCode) {
    const localDate = (value: string | null) => {
      if (!value) return "";
      const d = new Date(value);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    };

    setEditingPromoId(promo.id);
    setPromoForm({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: String(promo.discount_value),
      minimum_order_amount: String(promo.minimum_order_amount || 0),
      starts_at: localDate(promo.starts_at),
      expires_at: localDate(promo.expires_at),
      usage_limit: promo.usage_limit === null ? "" : String(promo.usage_limit),
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
      promoForm.usage_limit.trim() === "" ? null : Number(promoForm.usage_limit);

    if (!code || !Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid promo code and discount value.");
      return;
    }
    if (promoForm.discount_type === "percentage" && value > 100) {
      setMessage("Percentage discounts cannot exceed 100%.");
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

    if (expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      setMessage("The expiry date must be after the start date.");
      return;
    }

    setLoading(true);
    setMessage("");

    const promoData = {
      code,
      discount_type: promoForm.discount_type,
      discount_value: value,
      minimum_order_amount: minimum,
      starts_at: startsAt,
      expires_at: expiresAt,
      usage_limit: usageLimit,
    };

    const result = editingPromoId
      ? await supabase.from("promo_codes").update(promoData).eq("id", editingPromoId)
      : await supabase.from("promo_codes").insert({
          ...promoData,
          usage_count: 0,
          is_active: true,
        });

    if (result.error) {
      setMessage("Could not save promo code: " + result.error.message);
    } else {
      setMessage(editingPromoId ? "Promo code updated." : "Promo code created.");
      resetPromoForm();
      await loadPromoCodes();
    }

    setLoading(false);
  }

  async function togglePromo(promo: PromoCode) {
    setLoading(true);
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    setMessage(error ? error.message : "Promo code status updated.");
    if (!error) await loadPromoCodes();
    setLoading(false);
  }

  async function deletePromo(promo: PromoCode) {
    if (!window.confirm(`Delete promo code "${promo.code}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", promo.id);

    setMessage(error ? error.message : "Promo code deleted.");
    if (!error) {
      if (editingPromoId === promo.id) resetPromoForm();
      await loadPromoCodes();
    }
    setLoading(false);
  }

  function updateOrderLine(index: number, field: keyof OrderLine, value: string) {
    setOrderLines((previous) =>
      previous.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  const orderTotal = orderLines.reduce((total, line) => {
    const product = products.find((p) => p.id === line.product_id);
    return total + (product ? discountedPrice(product) : 0) * Number(line.quantity || 0);
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

    if (!validLines.length) {
      setMessage("Add at least one product to this order.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const customer = customers.find((c) => c.user_id === selectedCustomer);
      if (!customer) throw new Error("Customer could not be found.");

      const preparedItems = validLines.map((line) => {
        const product = products.find((p) => p.id === line.product_id);
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

      const subtotal = preparedItems.reduce((sum, item) => sum + item.total_price, 0);
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

      const { error: itemsError } = await supabase.from("order_items").insert(
        preparedItems.map((item) => ({ order_id: newOrder.id, ...item }))
      );

      if (itemsError) {
        await supabase.from("customer_orders").delete().eq("id", newOrder.id);
        throw itemsError;
      }

      setMessage(`Order ${orderNumber} created successfully.`);
      setSelectedCustomer("");
      setOrderLines([{ product_id: "", quantity: "1" }]);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create order.");
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
      shipping_tracking_url: order.shipping_tracking_url || "",
      shipping_dispatch_date: order.shipping_dispatch_date?.slice(0, 10) || "",
      shipping_estimated_delivery:
        order.shipping_estimated_delivery?.slice(0, 10) || "",
      shipping_fee: String(order.shipping_fee || 0),
    });
  }

  async function saveOrderUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingOrder) return;

    const fee = Number(orderUpdate.shipping_fee);
    if (!Number.isFinite(fee) || fee < 0) {
      setMessage("Enter a valid shipping fee.");
      return;
    }
    if (
      orderUpdate.shipping_tracking_url.trim() &&
      !/^https?:\/\/.+/i.test(orderUpdate.shipping_tracking_url.trim())
    ) {
      setMessage("Enter a valid tracking link.");
      return;
    }
    if (
      editingOrder.shipping_payment_status === "Paid" &&
      fee !== Number(editingOrder.shipping_fee || 0)
    ) {
      setMessage("A shipping fee that has been paid cannot be changed.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("customer_orders")
      .update({
        order_status: orderUpdate.order_status,
        payment_status: orderUpdate.payment_status,
        shipping_status: orderUpdate.shipping_status,
        tracking_number: orderUpdate.tracking_number.trim() || null,
        shipping_carrier: orderUpdate.shipping_carrier.trim() || null,
        shipping_notes: orderUpdate.shipping_notes.trim() || null,
        shipping_tracking_url: orderUpdate.shipping_tracking_url.trim() || null,
        shipping_dispatch_date: orderUpdate.shipping_dispatch_date || null,
        shipping_estimated_delivery: orderUpdate.shipping_estimated_delivery || null,
        shipping_fee: fee,
        shipping_payment_status:
          fee <= 0
            ? "Not required"
            : editingOrder.shipping_payment_status === "Paid"
              ? "Paid"
              : "Pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingOrder.id);

    if (error) {
      setMessage("Could not update order: " + error.message);
    } else {
      setMessage(`Order ${editingOrder.order_number} updated.`);
      setEditingOrder(null);
      await loadOrders();
    }

    setLoading(false);
  }

  async function createInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoiceOrder) return;

    setLoading(true);
    const { error } = await supabase.from("customer_invoices").insert({
      user_id: invoiceOrder.user_id,
      order_id: invoiceOrder.id,
      invoice_number: makeReference("INV"),
      invoice_type: "Order Invoice",
      amount: invoiceOrder.total_amount,
      payment_status: invoiceOrder.payment_status || "Pending",
      due_date: invoiceDueDate || null,
    });

    setMessage(error ? error.message : "Invoice created successfully.");
    if (!error) {
      setInvoiceOrder(null);
      await loadInvoices();
    }
    setLoading(false);
  }

  async function createReceipt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!receiptOrder) return;

    const amount = Number(receiptAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setLoading(true);

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
            amount >= Number(receiptOrder.total_amount) ? "Paid" : "Partially paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", receiptOrder.id);

      setMessage(
        paymentError
          ? "Receipt created, but order payment status could not be updated: " +
              paymentError.message
          : "Payment receipt created successfully."
      );

      setReceiptOrder(null);
      await Promise.all([loadReceipts(), loadOrders()]);
    }

    setLoading(false);
  }

  function customerName(userId: string) {
    const customer = customers.find((c) => c.user_id === userId);
    return customer?.full_name || customer?.email || "Customer";
  }

  function customerEmail(userId: string) {
    return customers.find((c) => c.user_id === userId)?.email || "";
  }

  function orderFor(orderId: string | null) {
    return orders.find((o) => o.id === orderId) || null;
  }

  function itemsFor(orderId: string) {
    return orderItems.filter((item) => item.order_id === orderId);
  }

  function printDocument() {
    window.print();
  }

  function copyPromo(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => setMessage("Promo code copied."),
      () => window.prompt("Copy this promo code:", code)
    );
  }

  function renderProductForm(
    values: typeof emptyForm,
    setValues: (value: typeof emptyForm) => void,
    selectedImage: File | null,
    setSelectedImage: (file: File | null) => void,
    submit: (e: FormEvent<HTMLFormElement>) => void,
    isEditing: boolean,
    imageInputId: string,
    reset: () => void
  ) {
    return (
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelStyle}>Product Name</label>
          <input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
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
            value={values.price}
            onChange={(e) => setValues({ ...values, price: e.target.value })}
            required
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Product Discount (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values.discount_percent}
            onChange={(e) =>
              setValues({ ...values, discount_percent: e.target.value })
            }
            className={inputStyle}
          />
          <p className="mt-1 text-xs text-[#756574]">
            Enter 0 for no discount.
          </p>
        </div>

        <div>
          <label className={labelStyle}>Category</label>
          <select
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
            required
            className={inputStyle}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelStyle}>Product Origin</label>
          <select
            value={values.origin}
            onChange={(e) => setValues({ ...values, origin: e.target.value })}
            className={inputStyle}
          >
            <option>In stock in Nigeria</option>
            <option>China preorder</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className={labelStyle}>Quantity</label>
          <input
            type="number"
            min="0"
            step="1"
            value={values.quantity}
            onChange={(e) => setValues({ ...values, quantity: e.target.value })}
            required
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Product Photo</label>
          <input
            id={imageInputId}
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
            className={inputStyle}
          />
          {isEditing && (
            <p className="mt-1 text-xs text-[#756574]">
              Leave empty to keep the current photo.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={labelStyle}>Description</label>
          <textarea
            value={values.description}
            onChange={(e) =>
              setValues({ ...values, description: e.target.value })
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
            className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Product"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-[#eadce6] px-7 py-3 text-[#43243b]"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    );
  }

  function renderProductCards(
    items: Product[],
    edit: (product: Product) => void,
    toggle: (product: Product) => void,
    remove: (product: Product) => void,
    refresh: () => void,
    title: string
  ) {
    return (
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#43243b]">
            {title} ({items.length})
          </h2>
          <button
            onClick={refresh}
            className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-[#756574]">
            No products added yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
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
                  <h3 className="font-bold text-[#43243b]">{product.name}</h3>

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
                    <p className="mt-2 font-semibold">{money(product.price)}</p>
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
                      onClick={() => edit(product)}
                      className="rounded-lg bg-[#75436d] px-4 py-2 text-sm text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(product)}
                      className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm"
                    >
                      {product.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => remove(product)}
                      disabled={loading}
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
    );
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
          <h1 className="text-3xl font-bold text-[#43243b]">Oraia by Dara</h1>
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

          {message && <p className="mb-4 text-sm text-red-600">{message}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[#75436d] p-3 font-semibold text-white disabled:opacity-50"
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
            <h1 className="text-3xl font-bold text-[#43243b]">Oraia by Dara</h1>
            <p className="mt-1 text-sm text-[#756574]">
              Admin Management Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-[#75436d] px-5 py-2.5 text-sm font-semibold text-[#75436d]"
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

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Products", products.length],
            ["Dropshipper Products", dropshipperProducts.length],
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
              <p className="mt-2 text-2xl font-bold text-[#43243b]">{value}</p>
            </div>
          ))}
        </div>

        <nav className="mb-8 flex flex-wrap gap-2">
          {(
            [
              ["products", "Products"],
              ["dropshipper", "Dropshipper Products"],
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
                  : "border border-[#eadce6] bg-white text-[#43243b]"
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
              {renderProductForm(
                form,
                setForm,
                image,
                setImage,
                saveProduct,
                !!editingId,
                "product-image",
                resetProductForm
              )}
            </section>

            {renderProductCards(
              products,
              editProduct,
              toggleProduct,
              deleteProduct,
              loadProducts,
              "Your Products"
            )}
          </>
        )}

        {tab === "dropshipper" && (
          <>
            <section className="mb-6 rounded-2xl border border-[#eadce6] bg-[#f9edf5] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-[#43243b]">
                Dropshipper Product Catalogue
              </h2>
              <p className="mt-2 text-sm text-[#756574]">
                Products added here belong only to the dropshipper catalogue.
                They are stored separately from your normal customer products.
              </p>
            </section>

            <section className="mb-10 rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-6 text-xl font-bold text-[#43243b]">
                {editingDropshipperId
                  ? "Edit Dropshipper Product"
                  : "Add Dropshipper Product"}
              </h2>

              {renderProductForm(
                dropshipperForm,
                setDropshipperForm,
                dropshipperImage,
                setDropshipperImage,
                saveDropshipperProduct,
                !!editingDropshipperId,
                "dropshipper-product-image",
                resetDropshipperForm
              )}
            </section>

            {renderProductCards(
              dropshipperProducts,
              editDropshipperProduct,
              toggleDropshipperProduct,
              deleteDropshipperProduct,
              loadDropshipperProducts,
              "Dropshipper Products"
            )}
          </>
        )}

        {tab === "discounts" && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="mb-6 text-xl font-bold text-[#43243b]">
                {editingPromoId ? "Edit Promo Code" : "Create Promo Code"}
              </h2>

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
                </div>

                <div>
                  <label className={labelStyle}>Discount Type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discount_type: e.target.value as "percentage" | "fixed",
                      })
                    }
                    className={inputStyle}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₦)</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Discount Value</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={promoForm.discount_type === "percentage" ? 100 : undefined}
                    value={promoForm.discount_value}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, discount_value: e.target.value })
                    }
                    required
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Minimum Order Amount (₦)</label>
                  <input
                    type="number"
                    min="0"
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
                      setPromoForm({ ...promoForm, starts_at: e.target.value })
                    }
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={promoForm.expires_at}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, expires_at: e.target.value })
                    }
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.usage_limit}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, usage_limit: e.target.value })
                    }
                    className={inputStyle}
                    placeholder="Leave blank for unlimited"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {loading ? "Saving..." : editingPromoId ? "Save Changes" : "Create Promo Code"}
                  </button>
                  {editingPromoId && (
                    <button
                      type="button"
                      onClick={resetPromoForm}
                      className="rounded-xl border border-[#eadce6] px-5 py-3"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#43243b]">
                  Your Promo Codes ({promoCodes.length})
                </h2>
                <button
                  onClick={loadPromoCodes}
                  className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm"
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
                      !!promo.expires_at &&
                      new Date(promo.expires_at).getTime() < Date.now();
                    const notStarted =
                      !!promo.starts_at &&
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
                            <p className="text-xs uppercase text-[#756574]">Promo Code</p>
                            <h3 className="mt-1 text-2xl font-bold text-[#43243b]">
                              {promo.code}
                            </h3>
                          </div>
                          <span className="rounded-full bg-[#f9edf5] px-3 py-1 text-xs font-semibold text-[#75436d]">
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
                            Minimum spend: <strong>{money(promo.minimum_order_amount)}</strong>
                          </p>
                          <p>
                            Usage: <strong>{promo.usage_count} / {promo.usage_limit ?? "Unlimited"}</strong>
                          </p>
                          <p>
                            Starts: <strong>{dateTimeText(promo.starts_at)}</strong>
                          </p>
                          <p>
                            Expires: <strong>{dateTimeText(promo.expires_at)}</strong>
                          </p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0e2ec] pt-4">
                          <button
                            onClick={() => editPromo(promo)}
                            className="rounded-lg bg-[#75436d] px-4 py-2 text-sm text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => togglePromo(promo)}
                            className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm"
                          >
                            {promo.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deletePromo(promo)}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => copyPromo(promo.code)}
                            className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm"
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
                Only normal customer products are available in this order form.
              </p>

              {customers.length === 0 ? (
                <p className="rounded-xl bg-[#fff8fc] p-4 text-sm text-[#756574]">
                  No customer profiles found yet.
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
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-[#43243b]">
                        Products in this order
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setOrderLines((old) => [
                            ...old,
                            { product_id: "", quantity: "1" },
                          ])
                        }
                        className="text-sm font-semibold text-[#75436d]"
                      >
                        + Add another product
                      </button>
                    </div>

                    <div className="space-y-3">
                      {orderLines.map((line, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-[#f0e2ec] p-4 sm:grid-cols-[1fr_120px_auto]"
                        >
                          <div>
                            <label className={labelStyle}>Product</label>
                            <select
                              value={line.product_id}
                              onChange={(e) =>
                                updateOrderLine(index, "product_id", e.target.value)
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
                                  {product.name} · {money(discountedPrice(product))}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelStyle}>Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) =>
                                updateOrderLine(index, "quantity", e.target.value)
                              }
                              required
                              className={inputStyle}
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              disabled={orderLines.length === 1}
                              onClick={() =>
                                setOrderLines((old) =>
                                  old.length === 1 ? old : old.filter((_, i) => i !== index)
                                )
                              }
                              className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 disabled:opacity-30"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between rounded-xl bg-[#f9edf5] p-4">
                    <span className="font-semibold">Order Total</span>
                    <span className="text-xl font-bold">{money(orderTotal)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || products.length === 0}
                    className="rounded-xl bg-[#75436d] px-7 py-3 font-semibold text-white disabled:opacity-50"
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
                  className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm"
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
                          <p className="mt-2 text-sm">{customerName(order.user_id)}</p>
                          <p className="text-xs text-[#756574]">
                            {customerEmail(order.user_id)}
                          </p>
                          <p className="mt-1 text-xs text-[#756574]">
                            {dateText(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {money(order.total_amount, order.currency)}
                          </p>
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs ${statusClass(order.order_status)}`}>
                              {order.order_status}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs ${statusClass(order.payment_status)}`}>
                              {order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="my-4 space-y-2 border-y border-[#f0e2ec] py-4">
                        {itemsFor(order.id).map((item) => (
                          <div key={item.id} className="flex justify-between gap-2 text-sm">
                            <span>{item.product_name} × {item.quantity}</span>
                            <strong>{money(item.total_price, order.currency)}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="mb-4 rounded-xl bg-[#f9edf5] p-4">
                        <p className="text-sm text-[#756574]">Customer Shipping Fee</p>
                        <p className="mt-1 text-xl font-bold">
                          {money(Number(order.shipping_fee || 0), order.currency)}
                        </p>
                        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${statusClass(order.shipping_payment_status)}`}>
                          {order.shipping_payment_status || "Not required"}
                        </span>
                        {order.shipping_paid_at && (
                          <p className="mt-2 text-xs text-[#756574]">
                            Paid on: {dateTimeText(order.shipping_paid_at)}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        <p>Shipping: <strong>{order.shipping_status || "Not shipped"}</strong></p>
                        <p>Carrier: <strong>{order.shipping_carrier || "Not assigned"}</strong></p>
                        <p>Tracking: <strong>{order.tracking_number || "Not available"}</strong></p>
                      </div>

                      {(order.shipping_dispatch_date || order.shipping_estimated_delivery) && (
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <p>Dispatch Date: <strong>{dateText(order.shipping_dispatch_date)}</strong></p>
                          <p>Estimated Delivery: <strong>{dateText(order.shipping_estimated_delivery)}</strong></p>
                        </div>
                      )}

                      {order.shipping_tracking_url && (
                        <a
                          href={order.shipping_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-sm font-semibold text-[#75436d] underline"
                        >
                          Open Tracking Link
                        </a>
                      )}

                      {order.shipping_notes && (
                        <p className="mt-3 rounded-lg bg-[#fff8fc] p-3 text-sm">
                          {order.shipping_notes}
                        </p>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0e2ec] pt-4">
                        <button
                          onClick={() => openOrderEditor(order)}
                          className="rounded-lg bg-[#75436d] px-4 py-2 text-sm text-white"
                        >
                          Update Order
                        </button>
                        <button
                          onClick={() => {
                            setInvoiceOrder(order);
                            setInvoiceDueDate("");
                          }}
                          className="rounded-lg border border-[#75436d] px-4 py-2 text-sm text-[#75436d]"
                        >
                          Create Invoice
                        </button>
                        <button
                          onClick={() => {
                            setReceiptOrder(order);
                            setReceiptAmount(String(order.total_amount));
                            setReceiptMethod("Bank Transfer");
                            setReceiptReference("");
                            setReceiptNotes("");
                          }}
                          className="rounded-lg border border-green-600 px-4 py-2 text-sm text-green-700"
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
                className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm"
              >
                Refresh
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                No invoices created yet. You can create an invoice from an order.
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
                        <p className="mt-2 text-sm">{customerName(invoice.user_id)}</p>
                        <p className="text-xs text-[#756574]">{customerEmail(invoice.user_id)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{money(invoice.amount)}</p>
                        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs ${statusClass(invoice.payment_status)}`}>
                          {invoice.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[#f0e2ec] pt-4 text-sm sm:grid-cols-3">
                      <p>
                        Order: <strong>{orders.find((o) => o.id === invoice.order_id)?.order_number || "Not linked"}</strong>
                      </p>
                      <p>
                        Invoice type: <strong>{invoice.invoice_type || "Order Invoice"}</strong>
                      </p>
                      <p>
                        Due date: <strong>{dateText(invoice.due_date)}</strong>
                      </p>
                    </div>

                    <button
                      onClick={printDocument}
                      className="mt-4 rounded-lg border border-[#75436d] px-4 py-2 text-sm font-semibold text-[#75436d]"
                    >
                      Print / Save Invoice
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
                className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm"
              >
                Refresh
              </button>
            </div>

            {receipts.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#756574]">
                No receipts recorded yet. Record a payment from the Orders section.
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
                        <p className="mt-2 text-sm">{customerName(receipt.user_id)}</p>
                        <p className="text-xs text-[#756574]">{customerEmail(receipt.user_id)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{money(receipt.amount)}</p>
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
                          Payment Received
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-[#f0e2ec] pt-4 text-sm sm:grid-cols-2">
                      <p>
                        Order: <strong>{orders.find((o) => o.id === receipt.order_id)?.order_number || "Not linked"}</strong>
                      </p>
                      <p>Date: <strong>{dateText(receipt.created_at)}</strong></p>
                      <p>Method: <strong>{receipt.payment_method || "Not specified"}</strong></p>
                      <p>Reference: <strong>{receipt.payment_reference || "Not provided"}</strong></p>
                    </div>

                    {receipt.notes && (
                      <p className="mt-3 rounded-lg bg-[#fff8fc] p-3 text-sm">
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
                <label className={labelStyle}>Customer Shipping Fee (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyle}
                  value={orderUpdate.shipping_fee}
                  disabled={editingOrder.shipping_payment_status === "Paid"}
                  onChange={(e) =>
                    setOrderUpdate({ ...orderUpdate, shipping_fee: e.target.value })
                  }
                />
                <p className="mt-2 text-xs text-[#756574]">
                  The customer will see this shipping amount in their account.
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Shipping Payment Status: {editingOrder.shipping_payment_status || "Not required"}
                </p>
              </div>

              <div>
                <label className={labelStyle}>Order Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.order_status}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, order_status: e.target.value })}
                >
                  {["Pending", "Confirmed", "Processing", "Completed", "Cancelled"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Payment Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.payment_status}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, payment_status: e.target.value })}
                >
                  {["Pending", "Partially paid", "Paid", "Failed", "Refunded"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Shipping Status</label>
                <select
                  className={inputStyle}
                  value={orderUpdate.shipping_status}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_status: e.target.value })}
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
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Shipping Carrier</label>
                <input
                  className={inputStyle}
                  value={orderUpdate.shipping_carrier}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_carrier: e.target.value })}
                  placeholder="e.g. Skycargo"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Tracking Number</label>
                <input
                  className={inputStyle}
                  value={orderUpdate.tracking_number}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, tracking_number: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Tracking Website Link</label>
                <input
                  type="url"
                  className={inputStyle}
                  value={orderUpdate.shipping_tracking_url}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_tracking_url: e.target.value })}
                  placeholder="https://example.com/track"
                />
              </div>

              <div>
                <label className={labelStyle}>Dispatch Date</label>
                <input
                  type="date"
                  className={inputStyle}
                  value={orderUpdate.shipping_dispatch_date}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_dispatch_date: e.target.value })}
                />
              </div>

              <div>
                <label className={labelStyle}>Estimated Delivery Date</label>
                <input
                  type="date"
                  className={inputStyle}
                  value={orderUpdate.shipping_estimated_delivery}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_estimated_delivery: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Shipping / Delivery Update</label>
                <textarea
                  className={inputStyle}
                  rows={3}
                  value={orderUpdate.shipping_notes}
                  onChange={(e) => setOrderUpdate({ ...orderUpdate, shipping_notes: e.target.value })}
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
                className="rounded-xl border border-[#eadce6] px-6 py-3"
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
            <h2 className="text-xl font-bold text-[#43243b]">Create Invoice</h2>
            <p className="mt-2 text-sm text-[#756574]">
              {invoiceOrder.order_number} · {customerName(invoiceOrder.user_id)}
            </p>

            <div className="my-5 rounded-xl bg-[#f9edf5] p-4">
              <p className="text-sm text-[#756574]">Invoice Amount</p>
              <p className="mt-1 text-2xl font-bold">{money(invoiceOrder.total_amount)}</p>
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
                className="rounded-xl bg-[#75436d] px-6 py-3 font-semibold text-white"
              >
                {loading ? "Creating..." : "Generate Invoice"}
              </button>
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="rounded-xl border border-[#eadce6] px-6 py-3"
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
              <p className="mt-1 text-xl font-bold">{money(receiptOrder.total_amount)}</p>
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
                  {["Bank Transfer", "Paystack", "Card", "Cash", "Other"].map((method) => (
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
                className="rounded-xl bg-[#75436d] px-6 py-3 font-semibold text-white"
              >
                {loading ? "Saving..." : "Confirm Payment & Create Receipt"}
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="rounded-xl border border-[#eadce6] px-6 py-3"
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