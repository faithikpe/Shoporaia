
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WHATSAPP_NUMBER = "2349043423379";

const announcements = [
  "CHINA PREORDER IS OPEN. SHOP YOUR FAVOURITES.",
  "NEED SOMETHING FROM CHINA? LET ORAIA SOURCE IT FOR YOU.",
  "QUALITY FINDS. EASY ORDERING. DELIVERY ACROSS NIGERIA.",
];

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  origin: string;
  image: string;
  stock: boolean;
  isNew: boolean;
  created_at: string;
};

type CartItem = {
  productId: string;
  quantity: number;
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

function formatPrice(price: number) {
  return `₦${price.toLocaleString("en-NG")}`;
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
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-[0_5px_15px_rgba(64,37,63,0.06)] transition-all duration-500 hover:-translate-y-2 hover:border-[#d9b7ca] hover:shadow-[0_22px_40px_rgba(64,37,63,0.16)]">
      <div className="relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110 sm:h-64"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#fcf7fa] to-[#f1e1eb] text-sm text-gray-400 sm:h-64">
            Image coming soon
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-2 text-[10px] font-medium shadow-md ${
            product.stock
              ? "bg-white text-green-800"
              : "bg-[#40253f] text-white"
          }`}
        >
          {product.stock ? "In Nigeria" : "China Preorder"}
        </span>

        {product.isNew && (
          <span className="absolute right-14 top-3 rounded-full bg-[#f9eef3] px-3 py-2 text-[10px] font-semibold text-[#40253f] shadow-md">
            NEW
          </span>
        )}

        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#f9eef3] active:scale-95"
        >
          <span className={isWishlisted ? "text-pink-600" : "text-gray-500"}>
            {isWishlisted ? "♥" : "♡"}
          </span>
        </button>
      </div>

      <div className="relative bg-gradient-to-b from-white to-[#fdf9fb] p-4">
        <p className="text-xs text-gray-400">{product.category}</p>

        <h3 className="mt-2 min-h-10 text-sm font-semibold text-[#40253f]">
          {product.name}
        </h3>

        <p className="mt-2 font-semibold text-[#40253f]">
          {formatPrice(product.price)}
        </p>

        <p className="mt-1 text-xs text-gray-500">{product.origin}</p>

        <button
          type="button"
          onClick={onAdd}
          className="mt-4 w-full rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-3 py-3 text-xs font-medium text-white shadow-[0_5px_12px_rgba(64,37,63,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_9px_18px_rgba(64,37,63,0.3)] active:translate-y-0"
        >
          Add to Bag
        </button>
      </div>
    </article>
  );
}

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);

  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [showMenu, setShowMenu] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryPreference, setDeliveryPreference] = useState("Pickup");
  const [customerNote, setCustomerNote] = useState("");

  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState("");
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState("");

  // Rotate announcements and hide the announcement bar after a few seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((previous) =>
        (previous + 1) % announcements.length
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

  // Lock the homepage whenever the cart or wishlist is open.
  // Each open panel retains its own independent scroll area.
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

  // Load saved cart and wishlist
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("oraia_cart");
      const savedWishlist = localStorage.getItem("oraia_wishlist");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }

      if (savedWishlist) {
        const parsedWishlist = JSON.parse(savedWishlist);

        if (Array.isArray(parsedWishlist)) {
          setWishlist(parsedWishlist);
        }
      }
    } catch {
      setCart([]);
      setWishlist([]);
    }

    setStorageLoaded(true);
  }, []);

  // Save cart and wishlist
  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem("oraia_cart", JSON.stringify(cart));
  }, [cart, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;

    localStorage.setItem("oraia_wishlist", JSON.stringify(wishlist));
  }, [wishlist, storageLoaded]);

  // Check logged-in customer
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthChecked(true);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      setLoggingOut(false);
      return;
    }

    setAccountDropdown(false);
    setUser(null);

    router.push("/");
    router.refresh();

    setLoggingOut(false);
  }

  // Load products from Supabase
  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedProducts = await Promise.all(
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

          const isInStock =
            product.origin === "In stock in Nigeria";

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price),
            origin: isInStock
              ? "In stock in Nigeria"
              : "Ships from China",
            image: imageUrl,
            stock: isInStock,
            isNew:
              Date.now() -
                new Date(product.created_at).getTime() <
              30 * 24 * 60 * 60 * 1000,
            created_at: product.created_at,
          };
        })
      );

      setProducts(formattedProducts);
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
    loadProducts();
  }, []);

  // Cart calculations
  const cartProducts = cart
    .map((item) => {
      const product = products.find(
        (product) => product.id === item.productId
      );

      return product
        ? { ...product, quantity: item.quantity }
        : null;
    })
    .filter((item): item is Product & { quantity: number } => item !== null);

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartProducts.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const wishlistProducts = products.filter((product) =>
    wishlist.includes(product.id)
  );

  function addToBag(product: Product) {
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

      return [
        ...previous,
        { productId: product.id, quantity: 1 },
      ];
    });

    setCheckoutError("");
    setOrderSubmitted(false);
    setShowWishlist(false);
    setShowCart(true);
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
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

    addToBag(product);
    toggleWishlist(productId);
  }

  // Submit order request to Supabase
  async function handleCheckout() {
    setCheckoutError("");

    if (cartProducts.length === 0) {
      setCheckoutError("Your shopping bag is empty.");
      return;
    }

    if (!user) {
      localStorage.setItem("oraia_return_to_checkout", "true");
      router.push("/login");
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

    setCheckingOut(true);

    try {
      const orderNumber = `ORA-${Date.now()}`;

      const { data: order, error: orderError } = await supabase
        .from("customer_orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          order_status: "PENDING",
          payment_status: "UNPAID",
          subtotal: cartTotal,
          total_amount: cartTotal,
          currency: "NGN",
          shipping_status: "Not shipped",
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
          delivery_preference: deliveryPreference,
          customer_note: customerNote.trim() || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      const orderItems = cartProducts.map((product) => ({
        order_id: order.id,
        product_name: product.name,
        product_image: product.image || null,
        quantity: product.quantity,
        unit_price: product.price,
        total_price: product.price * product.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const messageLines = [
        "Hello Oraia by Dara! I have submitted an order request.",
        "",
        `Order number: ${order.order_number}`,
        `Name: ${customerName.trim()}`,
        `Phone: ${customerPhone.trim()}`,
        `Delivery preference: ${deliveryPreference}`,
        "",
        "Order details:",
        ...cartProducts.map(
          (product, index) =>
            `${index + 1}. ${product.name} x ${product.quantity} = ${formatPrice(
              product.price * product.quantity
            )} (${product.stock ? "In Nigeria" : "China Preorder"})`
        ),
        "",
        `Product total: ${formatPrice(cartTotal)}`,
        customerNote.trim() ? `Note: ${customerNote.trim()}` : "",
        "",
        "Please confirm my order and let me know the next steps.",
      ].filter(Boolean);

      const whatsappMessage = encodeURIComponent(
        messageLines.join("\n")
      );

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

      setSubmittedOrderNumber(order.order_number);
      setSubmittedWhatsAppUrl(whatsappUrl);
      setOrderSubmitted(true);

      setCart([]);
      localStorage.removeItem("oraia_cart");

      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDeliveryPreference("Pickup");
      setCustomerNote("");
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Unable to submit your order. Please try again."
      );
    } finally {
      setCheckingOut(false);
    }
  }

  const newArrivals = products
    .filter((product) => product.isNew)
    .slice(0, 4);

  const inStockProducts = products.filter(
    (product) => product.stock
  );

  const preorderProducts = products.filter(
    (product) => !product.stock
  );

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  function renderProductCard(product: Product) {
    return (
      <ProductCard
        key={product.id}
        product={product}
        onAdd={() => addToBag(product)}
        isWishlisted={wishlist.includes(product.id)}
        onToggleWishlist={() => toggleWishlist(product.id)}
      />
    );
  }

  function closeMenu() {
    setShowMenu(false);
  }

  function openWishlistFromMenu() {
    setShowCart(false);
    setShowWishlist(true);
    setShowMenu(false);
    setAccountDropdown(false);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#302033]">
      {/* ROTATING ANNOUNCEMENT BAR */}
      <div
        aria-hidden={!announcementVisible}
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-r from-[#40253f] via-[#593653] to-[#40253f] px-10 text-center text-[10px] font-medium tracking-[0.16em] text-white shadow-[0_4px_14px_rgba(64,37,63,0.18)] transition-all duration-700 ease-in-out sm:text-xs ${
          announcementVisible
            ? "max-h-12 min-h-10 py-3 opacity-100"
            : "max-h-0 min-h-0 -translate-y-full py-0 opacity-0"
        }`}
      >
        <span
          key={announcementIndex}
          className="animate-[fadeIn_0.6s_ease-in-out]"
        >
          {announcements[announcementIndex]}
        </span>

        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {announcements.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full transition-all ${
                announcementIndex === index
                  ? "w-4 bg-white"
                  : "w-1 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/95 shadow-[0_5px_18px_rgba(64,37,63,0.07)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">

          {/* LOGO */}
          <a
            href="#home"
            onClick={closeMenu}
            className="flex shrink-0 items-center gap-2"
          >
            <img
              src="/oraia-monogram.png"
              alt="Oraia by Dara monogram"
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

          {/* HEADER ACTIONS */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* ACCOUNT */}
            {!authChecked ? (
              <span className="hidden text-xs text-gray-400 sm:block">
                Loading...
              </span>
            ) : !user ? (
              <a
                href="/login"
                aria-label="Log in"
                title="Log in"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white text-lg text-[#40253f] shadow-[0_3px_9px_rgba(64,37,63,0.08)] transition-all hover:-translate-y-0.5 hover:bg-[#f9eef3] hover:shadow-md"
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
              </a>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setAccountDropdown((previous) => !previous)
                  }
                  aria-label="My account"
                  title="My account"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white text-[#40253f] shadow-[0_3px_9px_rgba(64,37,63,0.08)] transition-all hover:-translate-y-0.5 hover:bg-[#f9eef3] hover:shadow-md"
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
                  <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-pink-100 bg-white shadow-[0_15px_35px_rgba(64,37,63,0.18)]">
                    <a
                      href="/account"
                      className="block px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                    >
                      My Dashboard
                    </a>

                    <a
                      href="/account#profile"
                      className="block border-t border-pink-50 px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                    >
                      My Profile
                    </a>

                    <a
                      href="/account#orders"
                      className="block border-t border-pink-50 px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                    >
                      My Orders
                    </a>

                    <a
                      href="/account#addresses"
                      className="block border-t border-pink-50 px-5 py-4 text-sm text-[#40253f] hover:bg-[#fcf7fa]"
                    >
                      My Addresses
                    </a>

                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="block w-full border-t border-pink-100 px-5 py-4 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {loggingOut ? "Logging Out..." : "Log Out"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SHOPPING BAG */}
            <button
              type="button"
              onClick={() => {
                setShowWishlist(false);
                setShowCart(true);
                closeMenu();
              }}
              aria-label="Open shopping bag"
              title="Shopping bag"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white text-[#40253f] shadow-[0_3px_9px_rgba(64,37,63,0.08)] transition-all hover:-translate-y-0.5 hover:bg-[#f9eef3] hover:shadow-md"
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
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#40253f] px-1 text-[9px] font-semibold text-white shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            {/* MENU BUTTON */}
            <button
              type="button"
              onClick={() => {
                setShowMenu((previous) => !previous);
                setAccountDropdown(false);
              }}
              aria-label={showMenu ? "Close menu" : "Open menu"}
              aria-expanded={showMenu}
              className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-4 text-xs font-medium text-white shadow-[0_5px_12px_rgba(64,37,63,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            >
              <span className="text-base leading-none">
                {showMenu ? "×" : "☰"}
              </span>
              <span className="hidden sm:inline">
                {showMenu ? "Close" : "Menu"}
              </span>
            </button>
          </div>
        </div>

        {/* EXPANDABLE NAVIGATION MENU */}
        {showMenu && (
          <div className="absolute left-0 right-0 top-full z-50 border-t border-pink-100 bg-white shadow-[0_20px_35px_rgba(64,37,63,0.16)]">
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
              <div className="grid gap-8 md:grid-cols-3">

                <div>
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b47c9c]">
                    Explore Oraia
                  </p>

                  <nav className="space-y-1">
                    {[
                      ["Home", "#home"],
                      ["New Arrivals", "#new-arrivals"],
                      ["In-Stock Collection", "#in-stock"],
                      ["China Preorder", "#china-preorder"],
                      ["Shop All Products", "#catalogue"],
                    ].map(([label, link]) => (
                      <a
                        key={label}
                        href={link}
                        onClick={closeMenu}
                        className="block rounded-lg px-3 py-3 text-sm text-[#40253f] transition hover:bg-[#fcf7fa]"
                      >
                        {label}
                      </a>
                    ))}

                    {/* WISHLIST INSIDE MENU */}
                    <button
                      type="button"
                      onClick={openWishlistFromMenu}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#40253f] transition hover:bg-[#fcf7fa]"
                    >
                      <span>Wishlist</span>

                      <span className="flex items-center gap-2 text-xs text-[#b47c9c]">
                        {wishlist.length > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f9eef3] px-1.5 font-semibold">
                            {wishlist.length}
                          </span>
                        )}
                        <span>♡</span>
                      </span>
                    </button>
                  </nav>
                </div>

                <div>
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b47c9c]">
                    Our Services
                  </p>

                  <nav className="space-y-1">
                    {[
                      ["Personal Shopping", "#services"],
                      ["Import & Procurement", "#services"],
                      ["Shipping Information", "#shipping"],
                      ["How It Works", "#how-it-works"],
                    ].map(([label, link]) => (
                      <a
                        key={label}
                        href={link}
                        onClick={closeMenu}
                        className="block rounded-lg px-3 py-3 text-sm text-[#40253f] transition hover:bg-[#fcf7fa]"
                      >
                        {label}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="rounded-2xl border border-white bg-gradient-to-br from-[#fffafd] via-[#f9eef3] to-[#efdce7] p-5 shadow-[inset_0_1px_4px_rgba(255,255,255,0.9),0_8px_20px_rgba(64,37,63,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b47c9c]">
                    Your Oraia Account
                  </p>

                  <h3 className="mt-3 text-lg font-semibold text-[#40253f]">
                    {user ? "Welcome Back" : "Make Shopping Easier"}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {user
                      ? "Manage your profile, saved addresses and orders."
                      : "Create an account to manage your orders and shopping details."}
                  </p>

                  {user ? (
                    <a
                      href="/account"
                      onClick={closeMenu}
                      className="mt-5 inline-block rounded-full bg-[#40253f] px-5 py-3 text-xs font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      My Dashboard
                    </a>
                  ) : (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <a
                        href="/login"
                        onClick={closeMenu}
                        className="rounded-full border border-[#40253f] px-5 py-3 text-xs font-medium text-[#40253f] transition hover:bg-white"
                      >
                        Log In
                      </a>

                      <a
                        href="/signup"
                        onClick={closeMenu}
                        className="rounded-full bg-[#40253f] px-5 py-3 text-xs font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        Create Account
                      </a>
                    </div>
                  )}

                  <div className="mt-5 border-t border-pink-200 pt-4">
                    <a
                      href="https://wa.me/2349043423379"
                      target="_blank"
                      rel="noreferrer"
                      onClick={closeMenu}
                      className="text-xs font-medium text-[#40253f] underline underline-offset-4"
                    >
                      Need help? Contact us on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* CART PANEL */}
      {showCart && (
        <div
          className="fixed inset-0 z-[70] flex h-dvh justify-end overflow-hidden overscroll-none bg-black/40 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCart(false);
            }
          }}
        >
          <div className="flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-pink-100 px-6 py-5 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
                  Your Selection
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#40253f]">
                  Shopping Bag ({cartCount})
                </h2>
              </div>

              <button
                onClick={() => setShowCart(false)}
                className="rounded-full bg-[#fcf7fa] px-4 py-2 text-sm text-[#40253f]"
              >
                Close
              </button>
            </div>

            {/* Shopping bag has its own independent scroll area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {cartProducts.length === 0 && !orderSubmitted ? (
                <div className="py-16 text-center">
                  <p className="text-4xl text-[#b47c9c]">♡</p>
                  <h3 className="mt-4 font-semibold text-[#40253f]">
                    Your shopping bag is empty
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add products you love and they will appear here.
                  </p>
                  <button
                    onClick={() => setShowCart(false)}
                    className="mt-6 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {cartProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-4 border-b border-pink-100 pb-5"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-24 w-24 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[#fcf7fa] text-xs text-gray-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#40253f]">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatPrice(product.price)}
                        </p>
                        <p className="mt-1 text-xs text-[#b47c9c]">
                          {product.stock ? "In Nigeria" : "China Preorder"}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                changeQuantity(product.id, -1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200"
                            >
                              −
                            </button>

                            <span className="text-sm font-medium">
                              {product.quantity}
                            </span>

                            <button
                              onClick={() =>
                                changeQuantity(product.id, 1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-pink-200"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="text-xs text-red-500"
                          >
                            Remove
                          </button>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-[#40253f]">
                          {formatPrice(product.price * product.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {orderSubmitted ? (
              <div className="max-h-[45%] shrink-0 overflow-y-auto overscroll-contain border-t border-pink-100 p-6">
                <div className="py-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-green-600 shadow-inner">
                    ✓
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-[#40253f]">
                    Order Request Submitted!
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Thank you for shopping with Oraia by Dara. Your order
                    request has been received successfully.
                  </p>

                  <div className="mt-5 rounded-xl bg-[#fcf7fa] p-4 shadow-inner">
                    <p className="text-xs text-gray-500">
                      Your order number
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#40253f]">
                      {submittedOrderNumber}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      Our team will contact you to confirm availability,
                      final details and payment arrangements. No payment
                      has been made.
                    </p>
                  </div>

                  <a
                    href={submittedWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 block w-full rounded-full bg-[#40253f] px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Follow Up on WhatsApp
                  </a>

                  <button
                    onClick={() => {
                      setOrderSubmitted(false);
                      setSubmittedOrderNumber("");
                      setSubmittedWhatsAppUrl("");
                      setShowCart(false);
                    }}
                    className="mt-3 w-full rounded-full border border-[#40253f] px-6 py-3 text-sm text-[#40253f]"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : cartProducts.length > 0 ? (
              <div className="max-h-[55%] shrink-0 overflow-y-auto overscroll-contain border-t border-pink-100 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Product total</span>
                  <span className="font-semibold text-[#40253f]">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Shipping charges, where applicable, will be confirmed separately.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#40253f]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(event.target.value)
                      }
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-pink-200 px-4 py-3 text-sm text-[#302033] placeholder:text-gray-400 outline-none focus:border-[#40253f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#40253f]">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(event) =>
                        setCustomerPhone(event.target.value)
                      }
                      placeholder="Enter your phone number"
                      className="w-full rounded-xl border border-pink-200 px-4 py-3 text-sm text-[#302033] placeholder:text-gray-400 outline-none focus:border-[#40253f]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#40253f]">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) =>
                        setCustomerEmail(event.target.value)
                      }
                      placeholder="Enter your email address"
                      className="w-full rounded-xl border border-pink-200 px-4 py-3 text-sm text-[#302033] placeholder:text-gray-400 outline-none focus:border-[#40253f]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#40253f]">
                      Delivery Preference *
                    </label>
                    <select
                      value={deliveryPreference}
                      onChange={(event) =>
                        setDeliveryPreference(event.target.value)
                      }
                      className="w-full rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm text-[#302033] outline-none focus:border-[#40253f]"
                    >
                      <option value="Pickup">Pickup</option>
                      <option value="Paid delivery">Paid delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#40253f]">
                      Additional Note (Optional)
                    </label>
                    <textarea
                      value={customerNote}
                      onChange={(event) =>
                        setCustomerNote(event.target.value)
                      }
                      placeholder="Any additional information about your order?"
                      rows={3}
                      className="w-full rounded-xl border border-pink-200 px-4 py-3 text-sm text-[#302033] placeholder:text-gray-400 outline-none focus:border-[#40253f]"
                    />
                  </div>
                </div>

                {checkoutError && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {checkoutError}
                  </p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="mt-5 w-full rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-6 py-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(64,37,63,0.24)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {checkingOut
                    ? "Submitting Order Request..."
                    : "Submit Order Request"}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                  This is an order request, not a payment. Our team will
                  contact you to confirm your order and arrange payment.
                </p>

                <button
                  onClick={() => setShowCart(false)}
                  className="mt-3 w-full rounded-full border border-[#40253f] px-6 py-3 text-sm text-[#40253f]"
                >
                  Continue Shopping
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* WISHLIST PANEL */}
      {showWishlist && (
        <div
          className="fixed inset-0 z-[70] flex h-dvh justify-end overflow-hidden overscroll-none bg-black/40 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowWishlist(false);
            }
          }}
        >
          <div className="flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-pink-100 px-6 py-5 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
                  Your Favourites
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#40253f]">
                  My Wishlist ({wishlist.length})
                </h2>
              </div>

              <button
                onClick={() => setShowWishlist(false)}
                className="rounded-full bg-[#fcf7fa] px-4 py-2 text-sm text-[#40253f]"
              >
                Close
              </button>
            </div>

            {/* Wishlist has its own independent scroll area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {wishlistProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl text-pink-500">♡</p>
                  <h3 className="mt-4 font-semibold text-[#40253f]">
                    No saved favourites yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Tap the heart on any product to save it here.
                  </p>
                  <button
                    onClick={() => setShowWishlist(false)}
                    className="mt-6 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {wishlistProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex gap-4 border-b border-pink-100 pb-5"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-24 w-24 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[#fcf7fa] text-xs text-gray-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#40253f]">
                          {product.name}
                        </h3>

                        <p className="mt-2 text-sm font-semibold text-[#40253f]">
                          {formatPrice(product.price)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              moveWishlistItemToCart(product.id)
                            }
                            className="rounded-full bg-[#40253f] px-4 py-2 text-xs text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            Move to Bag
                          </button>

                          <button
                            onClick={() => toggleWishlist(product.id)}
                            className="rounded-full border border-pink-200 px-4 py-2 text-xs text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REDESIGNED 3D HERO */}
      <section
        id="home"
        className="relative isolate overflow-hidden bg-gradient-to-br from-[#fffafd] via-[#f9eef3] to-[#efdce7] px-5 py-16 md:py-24"
      >
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#e9cbdc]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-white/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 md:gap-14">
          <div className="max-w-xl">
            <p className="mb-5 inline-block rounded-full border border-[#e8cbdc] bg-white/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#ad7191] shadow-sm sm:text-xs">
              A World of Beautiful Finds
            </p>

            <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-[#40253f] sm:text-5xl md:text-6xl">
              Your next
              <br />
              favourite find
              <br />
              <span className="font-normal italic text-[#b47c9c]">
                starts here.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-gray-600 sm:text-base">
              Discover beautiful finds, everyday essentials and exciting
              products sourced from China and Nigeria. Shop with ease or let
              Oraia find exactly what you need.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#catalogue"
                className="rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-7 py-4 text-sm font-medium text-white shadow-[0_9px_20px_rgba(64,37,63,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_25px_rgba(64,37,63,0.3)] active:translate-y-0"
              >
                Discover the Collection
              </a>

              <a
                href="#services"
                className="rounded-full border border-[#40253f]/30 bg-white/70 px-7 py-4 text-sm font-medium text-[#40253f] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
              >
                Shop For Me
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#70566e]">
              <span className="flex items-center gap-2">
                <span className="text-[#b47c9c]">✦</span>
                Quality Finds
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#b47c9c]">✦</span>
                Easy Ordering
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#b47c9c]">✦</span>
                China Sourcing
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -right-5 -top-5 h-40 w-40 rounded-full bg-[#e8cbdc] blur-3xl" />
            <div className="absolute -bottom-7 -left-5 h-40 w-40 rounded-full bg-white blur-3xl" />

            <div className="relative rounded-[2.4rem] border border-white/80 bg-white/40 p-3 shadow-[0_25px_60px_rgba(64,37,63,0.18)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200"
                alt="Fashion shopping collection"
                className="h-80 w-full rounded-[1.9rem] object-cover shadow-[0_12px_30px_rgba(64,37,63,0.18)] md:h-[480px]"
              />
            </div>

            <div className="absolute -bottom-5 left-4 rounded-2xl border border-white/80 bg-white/95 px-5 py-4 shadow-[0_12px_28px_rgba(64,37,63,0.16)] sm:left-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b47c9c]">
                Shop with Oraia
              </p>
              <p className="mt-1 text-sm font-semibold text-[#40253f]">
                Find what you love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SHOPPING BENEFITS */}
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:grid-cols-3">
        {[
          ["01", "Quality Finds", "Carefully sourced products."],
          ["02", "Easy Ordering", "Shop multiple products in one order."],
          ["03", "Delivery Options", "Choose pickup or paid delivery in Nigeria."],
        ].map((item) => (
          <div
            key={item[0]}
            className="rounded-2xl border border-pink-100/80 bg-gradient-to-br from-white to-[#fcf7fa] p-6 shadow-[0_7px_18px_rgba(64,37,63,0.07)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_17px_30px_rgba(64,37,63,0.13)]"
          >
            <p className="text-sm text-[#b47c9c]">{item[0]}</p>
            <h3 className="mt-2 font-semibold text-[#40253f]">
              {item[1]}
            </h3>
            <p className="mt-2 text-sm text-gray-500">{item[2]}</p>
          </div>
        ))}
      </section>

      {/* NEW ARRIVALS */}
      <section id="new-arrivals" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
            Fresh Finds
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
            New Arrivals
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Discover our latest products.
          </p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading products...
          </p>
        ) : newArrivals.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {newArrivals.map(renderProductCard)}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">
            New arrivals will appear here.
          </p>
        )}
      </section>

      {/* IN STOCK */}
      <section id="in-stock" className="bg-gradient-to-br from-[#fcf7fa] to-[#f4e8ef] px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
              Ready in Nigeria
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
              In-Stock Collection
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              Shop products already available in Nigeria.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-500">
              Loading products...
            </p>
          ) : inStockProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {inStockProducts.map(renderProductCard)}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">
              No in-stock products available yet.
            </p>
          )}
        </div>
      </section>

      {/* CHINA PREORDER */}
      <section id="china-preorder" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
            Source Your Favourites
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
            China Preorder Collection
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Explore products sourced from China. Submit an order request
            through our website. Our team will contact you to confirm your
            order and arrange payment. International shipping is calculated
            and paid separately after your goods arrive in Nigeria.
          </p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading products...
          </p>
        ) : preorderProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {preorderProducts.map(renderProductCard)}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">
            No China preorder products available yet.
          </p>
        )}
      </section>

      {/* CATEGORIES */}
      <section className="bg-gradient-to-br from-[#f9eef3] to-[#f0dfE9] px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[#ad7191]">
            Find Your Favourites
          </p>

          <h2 className="mb-7 mt-2 text-3xl font-semibold text-[#40253f]">
            Shop by Category
          </h2>

          <div className="flex flex-wrap gap-3">
            {["All", ...categories].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setCategory(item);
                  document.getElementById("catalogue")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className={`rounded-full border px-6 py-3 text-sm shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  category === item
                    ? "border-[#40253f] bg-gradient-to-br from-[#51324f] to-[#40253f] text-white shadow-[0_6px_14px_rgba(64,37,63,0.22)]"
                    : "border-pink-200 bg-white text-[#40253f] hover:border-[#c99db7]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT CATALOGUE */}
      <section id="catalogue" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
              Curated For You
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
              Explore Our Products
            </h2>
          </div>

          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border border-pink-200 bg-white px-5 py-3 text-sm text-[#302033] shadow-[0_4px_12px_rgba(64,37,63,0.06)] placeholder:text-gray-400 outline-none transition focus:border-[#40253f] focus:shadow-md sm:w-64"
          />
        </div>

        <p className="mb-5 text-sm text-gray-500">
          Showing: {category === "All" ? "All categories" : category}
        </p>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading products...
          </p>
        ) : error ? (
          <div className="rounded-xl bg-[#fcf7fa] p-6 text-center shadow-inner">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-4 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {filteredProducts.map(renderProductCard)}
            </div>

            {filteredProducts.length === 0 && (
              <p className="py-12 text-center text-gray-500">
                No products found. Try another search or category.
              </p>
            )}
          </>
        )}
      </section>

      {/* PERSONAL SHOPPING AND PROCUREMENT */}
      <section id="services" className="bg-gradient-to-br from-[#f9eef3] to-[#f1e1eb] px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[#ad7191]">
            More Than Just Shopping
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
            Let Oraia Shop For You
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-gray-600">
            Found something you love on a Chinese shopping platform? Send us
            the link or picture and let us help you source it.
          </p>

          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_10px_25px_rgba(64,37,63,0.09)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_35px_rgba(64,37,63,0.15)]">
              <h3 className="text-xl font-semibold text-[#40253f]">
                Personal Shopping
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                Send us product pictures or links from 1688 and Pinduoduo.
                We help you source and purchase your selected items from China.
              </p>

              <p className="mt-4 text-sm font-medium text-[#ad7191]">
                A 20% service fee applies to personal shopping orders.
              </p>

              <a
                href="https://wa.me/2349043423379?text=Hello%20Oraia%20by%20Dara%2C%20I%20need%20personal%20shopping%20assistance."
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-6 py-3 text-sm text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                Request Personal Shopping
              </a>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_10px_25px_rgba(64,37,63,0.09)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_35px_rgba(64,37,63,0.15)]">
              <h3 className="text-xl font-semibold text-[#40253f]">
                Import and Procurement
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                Sourcing and procurement support for individuals,
                entrepreneurs and business owners looking to purchase goods
                from China.
              </p>

              <p className="mt-4 text-sm font-medium text-[#ad7191]">
                A 20% service fee applies to procurement orders.
              </p>

              <a
                href="https://wa.me/2349043423379?text=Hello%20Oraia%20by%20Dara%2C%20I%20need%20import%20and%20procurement%20assistance."
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block rounded-full bg-gradient-to-br from-[#51324f] to-[#40253f] px-6 py-3 text-sm text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                Discuss Your Order
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SHIPPING OPTIONS */}
      <section id="shipping" className="bg-white px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[#ad7191]">
              Shipping From China to Nigeria
            </p>

            <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
              Choose Your Shipping Method
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-500">
              We offer three shipping methods to get your orders from China
              to Nigeria. Choose the option that best suits your goods and
              delivery timeline.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-[#fcf7fa] p-7 shadow-[0_9px_22px_rgba(64,37,63,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_19px_35px_rgba(64,37,63,0.14)]">
              <div className="text-3xl">✈️</div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#b47c9c]">
                Fastest Option
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#40253f]">
                Express Shipping
              </h3>
              <p className="mt-4 text-3xl font-bold text-[#ad7191]">
                3–7 Days
              </p>
              <p className="mt-4 text-sm leading-7 text-gray-500">
                Our fastest shipping option for customers who want their
                eligible goods delivered within a shorter timeframe.
              </p>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-[#fcf7fa] p-7 shadow-[0_9px_22px_rgba(64,37,63,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_19px_35px_rgba(64,37,63,0.14)]">
              <div className="text-3xl">🛫</div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#b47c9c]">
                Two Available Options
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#40253f]">
                Air Shipping
              </h3>

              <div className="mt-5 rounded-xl bg-[#fcf7fa] p-4 shadow-inner">
                <p className="font-semibold text-[#40253f]">GZ Air</p>
                <p className="mt-1 text-sm text-gray-500">
                  For normal goods
                </p>
                <p className="mt-3 text-2xl font-bold text-[#ad7191]">
                  10–14 Days
                </p>
              </div>

              <div className="mt-4 rounded-xl bg-[#fcf7fa] p-4 shadow-inner">
                <p className="font-semibold text-[#40253f]">
                  Hong Kong Air
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  For sensitive goods
                </p>
                <p className="mt-3 text-2xl font-bold text-[#ad7191]">
                  14–21 Days
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-[#fcf7fa] p-7 shadow-[0_9px_22px_rgba(64,37,63,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_19px_35px_rgba(64,37,63,0.14)]">
              <div className="text-3xl">🚢</div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#b47c9c]">
                Longer Transit
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#40253f]">
                Sea Shipping
              </h3>
              <p className="mt-4 text-3xl font-bold text-[#ad7191]">
                50–70 Days
              </p>
              <p className="mt-4 text-sm leading-7 text-gray-500">
                A suitable option for customers shipping goods by sea who
                can accommodate a longer delivery timeframe.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white bg-gradient-to-br from-[#f9eef3] to-[#f1e1eb] p-7 shadow-[0_8px_20px_rgba(64,37,63,0.07)]">
            <h3 className="font-semibold text-[#40253f]">
              Important Shipping Information
            </h3>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              All delivery timelines are estimates and may vary due to
              customs clearance, logistics schedules and other unforeseen
              circumstances.
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              You pay for your products in full after confirming your order.
              International shipping is paid separately after your goods
              arrive in Nigeria and the actual shipping charges are confirmed.
              A separate shipping invoice will then be prepared for payment.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-gradient-to-br from-[#fcf7fa] to-[#f3e6ee] px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[#ad7191]">
              Simple and Convenient
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
              How Shopping Works
            </h2>
          </div>

          <div className="mt-10 grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-5">
            {[
              [
                "01",
                "Choose Your Products",
                "Browse and add your favourites to your bag.",
              ],
              [
                "02",
                "Submit Your Order Request",
                "Complete the order form and wait for our team to confirm your order.",
              ],
              [
                "03",
                "We Process Your Order",
                "We source your items and assign the appropriate shipping batch.",
              ],
              [
                "04",
                "Pay Shipping Later",
                "After arrival in Nigeria, receive your shipping invoice.",
              ],
              [
                "05",
                "Receive Your Order",
                "Arrange pickup or paid delivery to your address.",
              ],
            ].map((item) => (
              <div
                key={item[0]}
                className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_7px_18px_rgba(64,37,63,0.07)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_16px_28px_rgba(64,37,63,0.13)]"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f9eef3] to-[#e8cbdc] font-semibold text-[#40253f] shadow-inner">
                  {item[0]}
                </div>

                <h3 className="mt-4 font-semibold text-[#40253f]">
                  {item[1]}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {item[2]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER ACCOUNT */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#593653] via-[#40253f] to-[#301c30] px-7 py-10 text-white shadow-[0_20px_45px_rgba(64,37,63,0.24)] md:px-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-pink-300/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-pink-200">
              Your Orders, Made Easier
            </p>

            <h2 className="mt-3 text-3xl font-semibold">
              {user ? "Welcome Back to Oraia" : "Welcome to Your Oraia Account"}
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-pink-100">
              {user
                ? "Visit your customer dashboard to manage your profile and shopping details."
                : "Create an account or log in to access your customer dashboard and manage your shopping details."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <a
                  href="/account"
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#40253f] shadow-md transition hover:-translate-y-1 hover:bg-pink-100 hover:shadow-lg"
                >
                  My Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/signup"
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#40253f] shadow-md transition hover:-translate-y-1 hover:bg-pink-100 hover:shadow-lg"
                  >
                    Create Account
                  </a>

                  <a
                    href="/login"
                    className="rounded-full border border-white px-7 py-3 text-sm font-semibold text-white transition hover:-translate-y-1 hover:bg-white/10"
                  >
                    Log In
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gradient-to-br from-[#51324f] to-[#301c30] px-5 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-widest">
              ORAIA BY DARA
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-pink-100">
              Your destination for quality finds, China preorder, personal
              shopping and procurement services.
            </p>

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-pink-100">
              {user ? (
                <a href="/account" className="hover:text-white">
                  My Account
                </a>
              ) : (
                <>
                  <a href="/signup" className="hover:text-white">
                    Sign Up
                  </a>
                  <a href="/login" className="hover:text-white">
                    Log In
                  </a>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Customer Support</h3>

            <p className="mt-3 text-sm leading-7 text-pink-100">
              Need help with an order or want us to source a product for you?
              Contact our team.
            </p>

            <a
              href="https://wa.me/2349043423379"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-full bg-white px-5 py-3 text-sm font-medium text-[#40253f] shadow-md transition hover:-translate-y-1 hover:shadow-lg"
            >
              Contact Us on WhatsApp
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/20 pt-6 text-xs text-pink-100">
          © 2026 Oraia by Dara. All rights reserved.
        </div>
      </footer>
    </main>
  );
}