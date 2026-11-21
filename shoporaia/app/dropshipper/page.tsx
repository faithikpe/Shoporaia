
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const announcements = [
  "WELCOME TO THE ORAIA DROPSHIPPER STORE.",
  "SHOP WHOLESALE PRODUCTS AND GROW YOUR BUSINESS.",
  "QUALITY FINDS. EASY ORDERING. SHOP WITH ORAIA.",
];

const categories = [
  "All",
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

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number;
  category: string;
  origin: string | null;
  quantity: number;
  image_path: string | null;
  image: string;
  created_at: string;
};

type CartItem = {
  productId: string;
  quantity: number;
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
};

function formatPrice(price: number) {
  return `₦${price.toLocaleString("en-NG", {
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function discountedPrice(product: Product) {
  const percent = Math.min(
    100,
    Math.max(0, Number(product.discount_percent) || 0)
  );

  return Math.round(product.price * (1 - percent / 100) * 100) / 100;
}

function calculatePromoDiscount(
  promo: PromoCode | null,
  subtotal: number
) {
  if (!promo || subtotal <= 0) return 0;

  if (subtotal < Number(promo.minimum_order_amount || 0)) {
    return 0;
  }

  const discount =
    promo.discount_type === "percentage"
      ? (subtotal * Number(promo.discount_value)) / 100
      : Math.min(Number(promo.discount_value), subtotal);

  return Math.round(discount * 100) / 100;
}

function ProductCard({
  product,
  onAdd,
  isWishlisted,
  onToggleWishlist,
}: {
  product: Product;
  onAdd: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  const salePrice = discountedPrice(product);
  const hasDiscount = product.discount_percent > 0;
  const unavailable = product.quantity <= 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-[0_5px_15px_rgba(64,37,63,0.06)] transition-all duration-500 hover:-translate-y-1 hover:border-[#d9b7ca] hover:shadow-[0_18px_35px_rgba(64,37,63,0.14)]">
      <div className="relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-64"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#fcf7fa] to-[#f1e1eb] text-sm text-gray-400 sm:h-64">
            Image coming soon
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-[#40253f] shadow-md">
          {unavailable ? "Out of Stock" : "Available"}
        </span>

        {hasDiscount && (
          <span className="absolute bottom-3 left-3 rounded-full bg-red-600 px-3 py-2 text-[10px] font-bold text-white shadow-md">
            {product.discount_percent}% OFF
          </span>
        )}

        {Date.now() - new Date(product.created_at).getTime() <
          30 * 24 * 60 * 60 * 1000 && (
          <span className="absolute right-14 top-3 rounded-full bg-[#f9eef3] px-3 py-2 text-[10px] font-semibold text-[#40253f] shadow-md">
            NEW
          </span>
        )}

        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-lg transition hover:scale-110 hover:bg-[#f9eef3]"
        >
          <span className={isWishlisted ? "text-pink-600" : "text-gray-500"}>
            {isWishlisted ? "♥" : "♡"}
          </span>
        </button>
      </div>

      <div className="bg-gradient-to-b from-white to-[#fdf9fb] p-4">
        <p className="text-xs text-gray-400">{product.category}</p>

        <h3 className="mt-2 min-h-10 text-sm font-semibold text-[#40253f]">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}

          <span className="font-semibold text-[#40253f]">
            {formatPrice(salePrice)}
          </span>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          {product.origin || "Oraia Dropshipper Product"}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {product.quantity} available
        </p>

        <button
          type="button"
          disabled={unavailable}
          onClick={onAdd}
          className="mt-4 w-full rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-3 py-3 text-xs font-medium text-white shadow-[0_5px_12px_rgba(64,37,63,0.22)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {unavailable ? "Out of Stock" : "Add to Bag"}
        </button>
      </div>
    </article>
  );
}

export default function DropshipperStorefront() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const [storageLoaded, setStorageLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);

  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryPreference, setDeliveryPreference] = useState("Pickup");
  const [customerNote, setCustomerNote] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex(
        (previous) => (previous + 1) % announcements.length
      );
    }, 4000);

    const hideAnnouncement = setTimeout(() => {
      setAnnouncementVisible(false);
    }, 6500);

    return () => {
      clearInterval(interval);
      clearTimeout(hideAnnouncement);
    };
  }, []);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("oraia_dropshipper_cart");
      const savedWishlist = localStorage.getItem(
        "oraia_dropshipper_wishlist"
      );

      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }

      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        if (Array.isArray(parsed)) setWishlist(parsed);
      }
    } catch {
      setCart([]);
      setWishlist([]);
    }

    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem(
      "oraia_dropshipper_cart",
      JSON.stringify(cart)
    );
  }, [cart, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem(
      "oraia_dropshipper_wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist, storageLoaded]);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/dropshipper/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("account_type, full_name, phone, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.account_type !== "dropshipper"
      ) {
        await supabase.auth.signOut();
        router.replace("/dropshipper/login");
        return;
      }

      setUser(session.user);
      setCustomerName(profile.full_name || "");
      setCustomerPhone(profile.phone || "");
      setCustomerEmail(profile.email || session.user.email || "");
      setAuthChecked(true);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        router.replace("/dropshipper/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!showCart && !showWishlist) return;

    const scrollY = window.scrollY;
    const body = document.body;

    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.left = previousStyles.left;
      body.style.right = previousStyles.right;
      body.style.width = previousStyles.width;
      body.style.overflow = previousStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [showCart, showWishlist]);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const { data, error: productError } = await supabase
        .from("dropshipper_products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productError) throw productError;

      const formatted = await Promise.all(
        (data || []).map(async (product) => {
          let imageUrl = "";

          if (product.image_path) {
            const { data: signedImage, error: imageError } =
              await supabase.storage
                .from("product-images")
                .createSignedUrl(product.image_path, 3600);

            if (!imageError) {
              imageUrl = signedImage?.signedUrl || "";
            }
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: Number(product.price),
            discount_percent: Math.min(
              100,
              Math.max(0, Number(product.discount_percent) || 0)
            ),
            category: product.category || "Other",
            origin: product.origin,
            quantity: Number(product.quantity || 0),
            image_path: product.image_path,
            image: imageUrl,
            created_at: product.created_at,
          };
        })
      );

      setProducts(formatted);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authChecked && user) {
      loadProducts();
    }
  }, [authChecked, user]);

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find(
            (product) => product.id === item.productId
          );

          return product
            ? { ...product, cartQuantity: item.quantity }
            : null;
        })
        .filter(
          (item): item is Product & { cartQuantity: number } =>
            item !== null
        ),
    [cart, products]
  );

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const originalCartTotal = cartProducts.reduce(
    (total, item) => total + item.price * item.cartQuantity,
    0
  );

  const cartTotal = cartProducts.reduce(
    (total, item) =>
      total + discountedPrice(item) * item.cartQuantity,
    0
  );

  const productSavings =
    Math.round((originalCartTotal - cartTotal) * 100) / 100;

  const promoEligible =
    !!appliedPromo &&
    cartTotal >= Number(appliedPromo.minimum_order_amount || 0);

  const promoDiscount = promoEligible
    ? calculatePromoDiscount(appliedPromo, cartTotal)
    : 0;

  const finalTotal = Math.max(0, cartTotal - promoDiscount);

  const wishlistProducts = products.filter((product) =>
    wishlist.includes(product.id)
  );

  const newArrivals = products
    .filter(
      (product) =>
        Date.now() - new Date(product.created_at).getTime() <
        30 * 24 * 60 * 60 * 1000
    )
    .slice(0, 4);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  function addToBag(product: Product) {
    if (product.quantity <= 0) return;

    const currentQuantity =
      cart.find((item) => item.productId === product.id)?.quantity || 0;

    if (currentQuantity >= product.quantity) {
      setCheckoutError(
        `Only ${product.quantity} units of ${product.name} are available.`
      );
      setShowCart(true);
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (item) => item.productId === product.id
      );

      if (existing) {
        return previous.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { productId: product.id, quantity: 1 }];
    });

    setCheckoutError("");
    setShowWishlist(false);
    setShowCart(true);
  }

  function changeQuantity(productId: string, amount: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setCart((previous) =>
      previous
        .map((item) => {
          if (item.productId !== productId) return item;

          const nextQuantity = item.quantity + amount;

          if (nextQuantity > product.quantity) {
            setCheckoutError(
              `Only ${product.quantity} units of ${product.name} are available.`
            );
            return item;
          }

          return { ...item, quantity: nextQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((previous) =>
      previous.filter((item) => item.productId !== productId)
    );
  }

  function toggleWishlist(productId: string) {
    setWishlist((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId]
    );
  }

  function moveWishlistItemToCart(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setShowWishlist(false);
    addToBag(product);
    toggleWishlist(productId);
  }

  async function applyPromoCode() {
    const code = promoInput.trim().toUpperCase();

    setPromoError("");
    setPromoMessage("");

    if (!code) {
      setPromoError("Please enter a promo code.");
      return;
    }

    if (cartProducts.length === 0) {
      setPromoError("Add products to your bag before applying a promo code.");
      return;
    }

    setApplyingPromo(true);

    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .ilike("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This promo code is invalid or inactive.");

      const promo = data as PromoCode;
      const now = new Date();

      if (promo.starts_at && new Date(promo.starts_at) > now) {
        throw new Error("This promo code is not available yet.");
      }

      if (promo.expires_at && new Date(promo.expires_at) <= now) {
        throw new Error("This promo code has expired.");
      }

      if (
        promo.usage_limit !== null &&
        Number(promo.usage_count) >= Number(promo.usage_limit)
      ) {
        throw new Error("This promo code has reached its usage limit.");
      }

      if (cartTotal < Number(promo.minimum_order_amount || 0)) {
        throw new Error(
          `Your product total must be at least ${formatPrice(
            Number(promo.minimum_order_amount || 0)
          )} to use this code.`
        );
      }

      if (
        !["percentage", "fixed"].includes(promo.discount_type) ||
        Number(promo.discount_value) <= 0
      ) {
        throw new Error("This promo code is not configured correctly.");
      }

      setAppliedPromo(promo);
      setPromoInput(promo.code);
      setPromoMessage(`${promo.code} applied successfully.`);
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(
        err instanceof Error
          ? err.message
          : "Unable to apply this promo code."
      );
    } finally {
      setApplyingPromo(false);
    }
  }

  function removePromoCode() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage("");
    setPromoError("");
  }

  async function handleCheckout() {
    setCheckoutError("");

    if (cartProducts.length === 0) {
      setCheckoutError("Your shopping bag is empty.");
      return;
    }

    if (!user) {
      router.push("/dropshipper/login");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError("Please enter your name and phone number.");
      return;
    }

    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
      setCheckoutError("Please enter a valid email address.");
      return;
    }

    if (appliedPromo && !promoEligible) {
      setCheckoutError(
        "Your order no longer meets this promo code's minimum amount."
      );
      return;
    }

    setCheckingOut(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      const orderResponse = await fetch(
        "/api/dropshipper/orders/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim(),
            deliveryPreference,
            customerNote: customerNote.trim(),
            promoCode: appliedPromo?.code || null,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.orderId) {
        throw new Error(
          orderData.error || "Unable to create your order."
        );
      }

      const paymentResponse = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          orderType: "dropshipper",
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentData.authorization_url) {
        throw new Error(
          paymentData.error ||
            "Your order was created, but payment could not be started. Please contact support."
        );
      }

      window.location.assign(paymentData.authorization_url);
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout. Please try again."
      );
      setCheckingOut(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setCheckoutError(error.message);
      setLoggingOut(false);
      return;
    }

    setUser(null);
    router.replace("/dropshipper/login");
  }

  function closePanels() {
    setShowCart(false);
    setShowWishlist(false);
    setShowMenu(false);
    setAccountDropdown(false);
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcf7fa]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-[#40253f]" />
          <p className="mt-4 text-sm text-[#40253f]">
            Loading your dropshipper store...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#302033]">
      <div
        aria-hidden={!announcementVisible}
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-r from-[#40253f] via-[#593653] to-[#40253f] px-10 text-center text-[10px] font-medium tracking-[0.16em] text-white transition-all duration-700 sm:text-xs ${
          announcementVisible
            ? "max-h-12 min-h-10 py-3 opacity-100"
            : "max-h-0 min-h-0 -translate-y-full py-0 opacity-0"
        }`}
      >
        <span key={announcementIndex}>
          {announcements[announcementIndex]}
        </span>

        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {announcements.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full ${
                announcementIndex === index
                  ? "w-4 bg-white"
                  : "w-1 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/95 shadow-[0_5px_18px_rgba(64,37,63,0.07)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <a href="#home" className="flex shrink-0 items-center gap-2">
            <img
              src="/oraia-monogram.png"
              alt="Oraia by Dara"
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />

            <span>
              <span className="block text-base font-bold leading-none tracking-[0.14em] text-[#40253f] sm:text-lg">
                ORAIA
              </span>
              <span className="mt-1 block text-[8px] font-medium tracking-[0.32em] text-[#b47c9c]">
                BY DARA
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountDropdown((previous) => !previous)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white text-[#40253f] shadow-sm hover:bg-[#f9eef3]"
                aria-label="My account"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.7-3.5 3.2-5.5 7-5.5s6.3 2 7 5.5" />
                </svg>
              </button>

              {accountDropdown && (
                <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-pink-100 bg-white shadow-xl">
                  <a
                    href="/dropshipper"
                    className="block px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                  >
                    My Store
                  </a>
                  <a
                    href="/dropshipper/orders"
                    className="block border-t border-pink-50 px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                  >
                    My Orders & Receipts
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="block w-full border-t border-pink-100 px-5 py-4 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {loggingOut ? "Logging Out..." : "Log Out"}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowWishlist(false);
                setShowCart(true);
                setAccountDropdown(false);
              }}
              aria-label="Open shopping bag"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white text-[#40253f] shadow-sm hover:bg-[#f9eef3]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-5 w-5"
              >
                <path d="M5 8h14l1 12H4L5 8Z" />
                <path d="M9 9V6a3 3 0 0 1 6 0v3" />
              </svg>

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#40253f] px-1 text-[9px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowMenu((previous) => !previous)}
              className="rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-4 py-3 text-xs font-medium text-white shadow-md"
            >
              {showMenu ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="border-t border-pink-100 bg-white px-5 py-5 shadow-lg">
            <div className="mx-auto flex max-w-7xl flex-wrap gap-5 text-sm text-[#40253f]">
              <a href="#home" onClick={closePanels}>Home</a>
              <a href="#new-arrivals" onClick={closePanels}>New Arrivals</a>
              <a href="#shop" onClick={closePanels}>Shop Products</a>
              <button
                type="button"
                onClick={() => {
                  setShowCart(false);
                  setShowWishlist(true);
                  setShowMenu(false);
                }}
              >
                My Wishlist ({wishlist.length})
              </button>
              <a href="/dropshipper/orders" onClick={closePanels}>
                My Orders
              </a>
            </div>
          </div>
        )}
      </header>

      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-[#fcf7fa] via-[#f9eef3] to-[#ead5e1]"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a56d8e]">
              Oraia by Dara
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-[#40253f] sm:text-6xl">
              Your Dropshipping Store Starts Here.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#725b70] sm:text-base">
              Explore our exclusive dropshipper catalogue, choose your
              products and shop directly from your dedicated store.
            </p>

            <a
              href="#shop"
              className="mt-8 inline-flex rounded-full bg-[#40253f] px-8 py-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              Explore Products
            </a>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute h-64 w-64 rounded-full bg-white/50 blur-3xl sm:h-96 sm:w-96" />
            <div className="relative flex h-64 w-full max-w-md items-center justify-center rounded-[2rem] border border-white/70 bg-white/50 p-8 shadow-xl backdrop-blur-sm sm:h-80">
              <div className="text-center">
                <img
                  src="/oraia-monogram.png"
                  alt="Oraia"
                  className="mx-auto h-24 w-24 object-contain sm:h-32 sm:w-32"
                />
                <p className="mt-5 text-xl font-semibold tracking-[0.25em] text-[#40253f]">
                  ORAIA
                </p>
                <p className="mt-2 text-[10px] tracking-[0.4em] text-[#b47c9c]">
                  DROPSHIPPER STORE
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-pink-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-7 text-center sm:grid-cols-4 sm:px-8">
          {[
            ["Exclusive Catalogue", "Dropshipper products"],
            ["Easy Shopping", "Simple order process"],
            ["Secure Checkout", "Paystack payments"],
            ["Order Tracking", "Dedicated order records"],
          ].map(([heading, description]) => (
            <div key={heading} className="py-2">
              <p className="text-sm font-semibold text-[#40253f]">
                {heading}
              </p>
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {newArrivals.length > 0 && (
        <section id="new-arrivals" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b47c9c]">
                Freshly added
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#40253f] sm:text-3xl">
                New Arrivals
              </h2>
            </div>
            <a
              href="#shop"
              className="text-xs font-semibold text-[#805675] hover:underline"
            >
              View all
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addToBag(product)}
                isWishlisted={wishlist.includes(product.id)}
                onToggleWishlist={() => toggleWishlist(product.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section id="shop" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b47c9c]">
            Shop Oraia
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
            Explore Our Products
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Browse the products available in your dropshipper store.
          </p>
        </div>

        <div className="mx-auto mb-6 max-w-2xl">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products or categories..."
            className="w-full rounded-full border border-pink-200 bg-white px-6 py-4 text-sm text-[#40253f] outline-none transition focus:border-[#805675] focus:ring-2 focus:ring-pink-100"
          />
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                category === item
                  ? "bg-[#40253f] text-white shadow-md"
                  : "border border-pink-100 bg-white text-[#725b70] hover:bg-[#f9eef3]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-[#40253f]" />
            <p className="mt-4 text-sm text-gray-500">
              Loading products...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="mt-4 rounded-full bg-[#40253f] px-6 py-3 text-xs font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-[#fcf7fa] px-5 py-16 text-center">
            <p className="text-lg font-semibold text-[#40253f]">
              No products found
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Try another search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => addToBag(product)}
                isWishlisted={wishlist.includes(product.id)}
                onToggleWishlist={() => toggleWishlist(product.id)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="bg-[#40253f] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
          <div>
            <p className="text-xl font-semibold tracking-[0.2em]">ORAIA</p>
            <p className="mt-2 text-[10px] tracking-[0.35em] text-pink-200">
              BY DARA
            </p>
            <p className="mt-4 max-w-xs text-xs leading-6 text-white/70">
              Your dedicated dropshipper shopping experience.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Quick Links</p>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/70">
              <a href="#home" className="hover:text-white">Home</a>
              <a href="#shop" className="hover:text-white">Shop Products</a>
              <a href="/dropshipper/orders" className="hover:text-white">
                My Orders
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Your Account</p>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/70">
              <a href="/dropshipper/orders" className="hover:text-white">
                Orders & Receipts
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="text-left hover:text-white"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 text-center text-[10px] text-white/50">
          © {new Date().getFullYear()} Oraia by Dara. All rights reserved.
        </div>
      </footer>

      {(showCart || showWishlist) && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          onClick={closePanels}
        />
      )}

      {showCart && (
        <aside className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-pink-100 px-5 py-5">
            <div>
              <h2 className="text-lg font-semibold text-[#40253f]">
                Your Shopping Bag
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCart(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f9eef3] text-lg text-[#40253f]"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {cartProducts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-semibold text-[#40253f]">
                  Your bag is empty
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Explore the store and add products to your bag.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="mt-5 rounded-full bg-[#40253f] px-6 py-3 text-xs font-semibold text-white"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cartProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-pink-50 pb-4"
                >
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fcf7fa]">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#40253f]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatPrice(discountedPrice(item))}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-pink-200 text-[#40253f]"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold text-[#40253f]">
                        {item.cartQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        disabled={item.cartQuantity >= item.quantity}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-pink-200 text-[#40253f] disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="mt-2 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-[#40253f]">
                    {formatPrice(
                      discountedPrice(item) * item.cartQuantity
                    )}
                  </p>
                </div>
              ))
            )}

            {cartProducts.length > 0 && (
              <>
                <div className="rounded-xl bg-[#fcf7fa] p-4">
                  <p className="text-sm font-semibold text-[#40253f]">
                    Promo Code
                  </p>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(event) => setPromoInput(event.target.value)}
                      placeholder="Enter code"
                      disabled={!!appliedPromo}
                      className="min-w-0 flex-1 rounded-lg border border-pink-200 bg-white px-3 py-3 text-xs outline-none focus:border-[#805675]"
                    />
                    {appliedPromo ? (
                      <button
                        type="button"
                        onClick={removePromoCode}
                        className="rounded-lg border border-pink-200 px-3 text-xs font-semibold text-[#40253f]"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={applyPromoCode}
                        disabled={applyingPromo}
                        className="rounded-lg bg-[#40253f] px-4 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {applyingPromo ? "..." : "Apply"}
                      </button>
                    )}
                  </div>

                  {promoMessage && (
                    <p className="mt-2 text-xs text-green-700">
                      {promoMessage}
                    </p>
                  )}
                  {promoError && (
                    <p className="mt-2 text-xs text-red-600">
                      {promoError}
                    </p>
                  )}
                </div>

                <div className="space-y-2 border-t border-pink-100 pt-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(originalCartTotal)}</span>
                  </div>

                  {productSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Product Discount</span>
                      <span>-{formatPrice(productSavings)}</span>
                    </div>
                  )}

                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Promo Discount</span>
                      <span>-{formatPrice(promoDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-pink-100 pt-3 text-base font-bold text-[#40253f]">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-pink-100 pt-4">
                  <h3 className="text-sm font-semibold text-[#40253f]">
                    Delivery Details
                  </h3>

                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-sm outline-none focus:border-[#805675]"
                  />

                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-sm outline-none focus:border-[#805675]"
                  />

                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-sm outline-none focus:border-[#805675]"
                  />

                  <select
                    value={deliveryPreference}
                    onChange={(event) =>
                      setDeliveryPreference(event.target.value)
                    }
                    className="w-full rounded-lg border border-pink-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#805675]"
                  >
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Delivery</option>
                  </select>

                  <textarea
                    value={customerNote}
                    onChange={(event) => setCustomerNote(event.target.value)}
                    placeholder="Additional delivery instructions (optional)"
                    rows={3}
                    className="w-full rounded-lg border border-pink-200 px-4 py-3 text-sm outline-none focus:border-[#805675]"
                  />
                </div>

                {checkoutError && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                    {checkoutError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkingOut
                    ? "Preparing Secure Payment..."
                    : `Proceed to Pay ${formatPrice(finalTotal)}`}
                </button>

                <p className="text-center text-[10px] leading-5 text-gray-400">
                  You will be redirected to Paystack to complete your payment securely.
                </p>
              </>
            )}
          </div>
        </aside>
      )}

      {showWishlist && (
        <aside className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-pink-100 px-5 py-5">
            <div>
              <h2 className="text-lg font-semibold text-[#40253f]">
                My Wishlist
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {wishlistProducts.length} saved product(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWishlist(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f9eef3] text-lg text-[#40253f]"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {wishlistProducts.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">
                Your wishlist is empty.
              </p>
            ) : (
              wishlistProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex gap-3 border-b border-pink-50 pb-4"
                >
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#fcf7fa]">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#40253f]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-[#805675]">
                      {formatPrice(discountedPrice(product))}
                    </p>

                    <button
                      type="button"
                      onClick={() => moveWishlistItemToCart(product.id)}
                      disabled={product.quantity <= 0}
                      className="mt-3 rounded-full bg-[#40253f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {product.quantity > 0 ? "Move to Bag" : "Out of Stock"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      className="ml-3 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
