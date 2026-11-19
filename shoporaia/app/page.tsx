
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WHATSAPP_NUMBER = "2349043423379";

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
    <article className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
      <div className="relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-48 w-full object-cover sm:h-64"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-[#fcf7fa] text-sm text-gray-400 sm:h-64">
            Image coming soon
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-2 text-[10px] font-medium ${
            product.stock
              ? "bg-white text-green-800"
              : "bg-[#40253f] text-white"
          }`}
        >
          {product.stock ? "In Nigeria" : "China Preorder"}
        </span>

        {product.isNew && (
          <span className="absolute right-14 top-3 rounded-full bg-[#f9eef3] px-3 py-2 text-[10px] font-semibold text-[#40253f]">
            NEW
          </span>
        )}

        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-sm transition hover:scale-110"
        >
          <span className={isWishlisted ? "text-pink-600" : "text-gray-500"}>
            {isWishlisted ? "♥" : "♡"}
          </span>
        </button>
      </div>

      <div className="p-4">
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
          className="mt-4 w-full rounded-full bg-[#40253f] px-3 py-3 text-xs font-medium text-white transition hover:bg-[#70466b]"
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

    // Keep the customer's saved cart and wishlist
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

  // Submit order to Supabase and continue to WhatsApp
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

    setCheckingOut(true);

    try {
      const orderNumber = `ORA-${Date.now()}`;

      const { data: order, error: orderError } = await supabase
        .from("customer_orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          order_status: "Pending confirmation",
          payment_status: "Unpaid",
          subtotal: cartTotal,
          total_amount: cartTotal,
          currency: "NGN",
          shipping_status: "Not shipped",
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
        "Hello Oraia by Dara! I would like to place an order.",
        "",
        `Order number: ${order.order_number}`,
        "",
        ...cartProducts.map(
          (product, index) =>
            `${index + 1}. ${product.name} x ${product.quantity} = ${formatPrice(
              product.price * product.quantity
            )} (${product.stock ? "In Nigeria" : "China Preorder"})`
        ),
        "",
        `Total product amount: ${formatPrice(cartTotal)}`,
        "",
        "Please confirm availability and send me the payment details.",
      ];

      const whatsappMessage = encodeURIComponent(
        messageLines.join("\n")
      );

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

      // Clear cart only after order and items have been saved
      setCart([]);
      localStorage.removeItem("oraia_cart");

      window.location.href = whatsappUrl;
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

  return (
    <main className="min-h-screen bg-white text-[#302033]">
      <div className="bg-[#40253f] px-4 py-3 text-center text-xs tracking-wider text-white">
        CHINA PREORDER • PERSONAL SHOPPING • NATIONWIDE DELIVERY
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <a href="#home" className="shrink-0">
            <span className="block text-2xl font-bold tracking-widest text-[#40253f]">
              ORAIA
            </span>
            <span className="block text-center text-xs tracking-[0.35em] text-[#b47c9c]">
              BY DARA
            </span>
          </a>

          <nav className="flex flex-wrap items-center gap-4 text-xs text-[#40253f] sm:gap-6 sm:text-sm">
            <a href="#home">Home</a>
            <a href="#new-arrivals">New Arrivals</a>
            <a href="#in-stock">In Stock</a>
            <a href="#china-preorder">Preorder</a>
            <a href="#services">Services</a>
            <a href="#shipping">Shipping</a>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCart(true);
                setShowWishlist(false);
              }}
              className="rounded-full bg-[#40253f] px-4 py-3 text-xs font-medium text-white hover:bg-[#70466b]"
            >
              Bag ({cartCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setShowWishlist(true);
                setShowCart(false);
              }}
              className="rounded-full border border-pink-200 bg-[#f9eef3] px-4 py-3 text-xs font-medium text-[#40253f]"
            >
              ♥ Saved ({wishlist.length})
            </button>

            {!authChecked ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : !user ? (
              <>
                <a
                  href="/login"
                  className="rounded-full border border-[#40253f] px-4 py-3 text-xs font-medium text-[#40253f] hover:bg-[#f9eef3]"
                >
                  Log In
                </a>

                <a
                  href="/signup"
                  className="rounded-full bg-[#40253f] px-4 py-3 text-xs font-medium text-white hover:bg-[#70466b]"
                >
                  Sign Up
                </a>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() =>
                    setAccountDropdown((previous) => !previous)
                  }
                  className="flex items-center gap-2 rounded-full border border-[#40253f] bg-[#f9eef3] px-4 py-3 text-xs font-medium text-[#40253f]"
                >
                  My Account
                  <span>{accountDropdown ? "▲" : "▼"}</span>
                </button>

                {accountDropdown && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-pink-100 bg-white shadow-xl">
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
          </div>
        </div>
      </header>

      {/* CART PANEL */}
      {showCart && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pink-100 px-6 py-5">
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

            <div className="flex-1 overflow-y-auto p-6">
              {cartProducts.length === 0 ? (
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
                    className="mt-6 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white"
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
                          className="h-24 w-24 rounded-xl object-cover"
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

            {cartProducts.length > 0 && (
              <div className="border-t border-pink-100 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Product total</span>
                  <span className="font-semibold text-[#40253f]">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Shipping charges, where applicable, will be confirmed separately.
                </p>

                {checkoutError && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {checkoutError}
                  </p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="mt-5 w-full rounded-full bg-[#40253f] px-6 py-4 text-sm font-semibold text-white hover:bg-[#70466b] disabled:opacity-50"
                >
                  {checkingOut
                    ? "Submitting Your Order..."
                    : "Proceed to WhatsApp Checkout"}
                </button>

                <button
                  onClick={() => setShowCart(false)}
                  className="mt-3 w-full rounded-full border border-[#40253f] px-6 py-3 text-sm text-[#40253f]"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WISHLIST PANEL */}
      {showWishlist && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-pink-100 px-6 py-5">
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

            <div className="flex-1 overflow-y-auto p-6">
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
                    className="mt-6 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white"
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
                          className="h-24 w-24 rounded-xl object-cover"
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
                            className="rounded-full bg-[#40253f] px-4 py-2 text-xs text-white"
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

      {/* HERO */}
      <section id="home" className="bg-[#f9eef3] px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#ad7191]">
              Welcome to Oraia by Dara
            </p>

            <h1 className="text-4xl font-semibold leading-tight text-[#40253f] md:text-6xl">
              Shop China.
              <br />
              Shop smarter.
              <br />
              Shop with Oraia.
            </h1>

            <p className="mt-6 max-w-md leading-7 text-gray-600">
              Discover beautiful finds, everyday essentials and exciting
              products sourced from China and Nigeria. Let us make shopping
              and importing easier for you.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#catalogue"
                className="rounded-full bg-[#40253f] px-7 py-3 text-sm text-white"
              >
                Explore Products
              </a>

              <a
                href="#services"
                className="rounded-full border border-[#40253f] px-7 py-3 text-sm text-[#40253f]"
              >
                Shop For Me
              </a>
            </div>
          </div>

          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200"
            alt="Fashion shopping collection"
            className="h-80 w-full rounded-2xl object-cover md:h-[430px]"
          />
        </div>
      </section>

      {/* SHOPPING BENEFITS */}
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:grid-cols-3">
        {[
          ["01", "Quality Finds", "Carefully sourced products."],
          ["02", "Easy Ordering", "Shop multiple products in one order."],
          ["03", "Delivery Options", "Choose pickup or paid delivery in Nigeria."],
        ].map((item) => (
          <div key={item[0]} className="rounded-xl bg-[#fcf7fa] p-6">
            <p className="text-sm text-[#b47c9c]">{item[0]}</p>
            <h3 className="mt-2 font-semibold text-[#40253f]">
              {item[1]}
            </h3>
            <p className="mt-2 text-sm text-gray-500">{item[2]}</p>
          </div>
        ))}
      </section>

      {/* NEW ARRIVALS */}
      <section id="new-arrivals" className="mx-auto max-w-7xl px-5 py-14">
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
      <section id="in-stock" className="bg-[#fcf7fa] px-5 py-14">
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
      <section id="china-preorder" className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#b47c9c]">
            Source Your Favourites
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#40253f]">
            China Preorder Collection
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Explore products sourced from China. Product payment is made
            through WhatsApp checkout. International shipping is calculated
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
      <section className="bg-[#f9eef3] px-5 py-14">
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
                className={`rounded-full border px-6 py-3 text-sm ${
                  category === item
                    ? "border-[#40253f] bg-[#40253f] text-white"
                    : "border-pink-200 bg-white text-[#40253f]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT CATALOGUE */}
      <section id="catalogue" className="mx-auto max-w-7xl px-5 py-14">
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
            className="w-full rounded-full border border-pink-200 px-5 py-3 text-sm outline-none sm:w-64"
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
          <div className="rounded-xl bg-[#fcf7fa] p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-4 rounded-full bg-[#40253f] px-6 py-3 text-sm text-white"
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
      <section id="services" className="bg-[#f9eef3] px-5 py-16">
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
            <div className="rounded-2xl bg-white p-8">
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
                className="mt-6 inline-block rounded-full bg-[#40253f] px-6 py-3 text-sm text-white"
              >
                Request Personal Shopping
              </a>
            </div>

            <div className="rounded-2xl bg-white p-8">
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
                className="mt-6 inline-block rounded-full bg-[#40253f] px-6 py-3 text-sm text-white"
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
            <div className="rounded-2xl border border-pink-100 bg-white p-7 shadow-sm">
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

            <div className="rounded-2xl border border-pink-100 bg-white p-7 shadow-sm">
              <div className="text-3xl">🛫</div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#b47c9c]">
                Two Available Options
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#40253f]">
                Air Shipping
              </h3>

              <div className="mt-5 rounded-xl bg-[#fcf7fa] p-4">
                <p className="font-semibold text-[#40253f]">GZ Air</p>
                <p className="mt-1 text-sm text-gray-500">
                  For normal goods
                </p>
                <p className="mt-3 text-2xl font-bold text-[#ad7191]">
                  10–14 Days
                </p>
              </div>

              <div className="mt-4 rounded-xl bg-[#fcf7fa] p-4">
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

            <div className="rounded-2xl border border-pink-100 bg-white p-7 shadow-sm">
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

          <div className="mt-8 rounded-2xl bg-[#f9eef3] p-7">
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
      <section id="how-it-works" className="bg-[#fcf7fa] px-5 py-16">
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
                "Confirm Your Order",
                "Send your order through WhatsApp and receive payment details.",
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
              <div key={item[0]} className="p-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f9eef3] font-semibold text-[#40253f]">
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
        <div className="rounded-2xl bg-[#40253f] px-7 py-10 text-white md:px-12">
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
                className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#40253f] hover:bg-pink-100"
              >
                My Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/signup"
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#40253f] hover:bg-pink-100"
                >
                  Create Account
                </a>

                <a
                  href="/login"
                  className="rounded-full border border-white px-7 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Log In
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#40253f] px-5 py-12 text-white">
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
              className="mt-4 inline-block rounded-full bg-white px-5 py-3 text-sm font-medium text-[#40253f]"
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
