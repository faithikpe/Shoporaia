
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DropshipperProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number;
  category: string;
  origin: string;
  quantity: number;
  image_path: string | null;
  image_url?: string | null;
};

export default function DropshipperDashboard() {
  const router = useRouter();

  const [products, setProducts] = useState<DropshipperProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("Dropshipper");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/dropshipper/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("full_name, account_type")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || profile?.account_type !== "dropshipper") {
      await supabase.auth.signOut();
      router.replace("/dropshipper/login");
      return;
    }

    setUserName(profile.full_name || "Dropshipper");

    const { data: productData, error: productError } = await supabase
      .from("dropshipper_products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (productError) {
      setMessage("Unable to load products. Please refresh and try again.");
      setLoading(false);
      return;
    }

    const productsWithImages = await Promise.all(
      (productData || []).map(async (product) => {
        if (!product.image_path) {
          return { ...product, image_url: null };
        }

        const { data: imageData } = await supabase.storage
          .from("product-images")
          .createSignedUrl(product.image_path, 3600);

        return {
          ...product,
          image_url: imageData?.signedUrl || null,
        };
      })
    );

    setProducts(productsWithImages);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/dropshipper/login");
    router.refresh();
  }

  const categories = [
    "All",
    ...Array.from(new Set(products.map((product) => product.category))),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function getDiscountedPrice(product: DropshipperProduct) {
    return product.price * (1 - product.discount_percent / 100);
  }

  return (
    <main className="min-h-screen bg-[#fff8fb]">
      <header className="sticky top-0 z-20 border-b border-pink-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dropshipper" className="text-xl font-bold tracking-wide text-pink-700">
            SHOPORAIA
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {userName}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-pink-600 to-pink-400 p-7 text-white sm:p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-pink-100">
            Dropshipper Store
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Welcome, {userName}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-pink-50 sm:text-base">
            Explore products available to dropshippers and browse the latest
            additions to the ShopOraia catalogue.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Dropshipper Catalogue
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Products listed here are exclusively for dropshipper accounts.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-pink-500"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-pink-500 sm:min-w-52"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className="mb-6 rounded-xl bg-pink-50 p-4 text-sm text-pink-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-500">
            Loading your catalogue...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pink-200 bg-white px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-gray-800">
              No products found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {products.length === 0
                ? "There are currently no active dropshipper products."
                : "Try another search or category."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative aspect-[4/5] bg-pink-50">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      No product image
                    </div>
                  )}

                  {product.discount_percent > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-pink-600 px-2 py-1 text-xs font-bold text-white">
                      -{product.discount_percent}%
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4">
                  <p className="text-xs font-medium text-pink-600">
                    {product.category}
                  </p>

                  <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold text-gray-900">
                    {product.name}
                  </h3>

                  <div className="mt-3">
                    <p className="font-bold text-gray-900">
                      {formatPrice(getDiscountedPrice(product))}
                    </p>

                    {product.discount_percent > 0 && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatPrice(product.price)}
                      </p>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {product.origin}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {product.quantity > 0
                      ? `${product.quantity} available`
                      : "Out of stock"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
