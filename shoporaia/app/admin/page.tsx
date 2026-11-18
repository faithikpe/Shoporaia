
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
  category: string;
  origin: string;
  quantity: number;
  image_path: string | null;
  is_active: boolean;
  imageUrl?: string;
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  origin: "In stock in Nigeria",
  quantity: "0",
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

export default function AdminPage() {
  const [email, setEmail] = useState("chidinmajoy568@gmail.com");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    await loadProducts();
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
    setMessage("You have logged out.");
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

        return { ...product, imageUrl };
      })
    );

    setProducts(items);
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
      category: product.category,
      origin: product.origin,
      quantity: String(product.quantity),
    });
    setImage(null);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
          category: form.category,
          origin: form.origin,
          quantity: Number(form.quantity),
          updated_at: new Date().toISOString(),
        };

        if (imagePath) {
          updates.image_path = imagePath;
        }

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
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong.";

      setMessage("Error: " + errorMessage);
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
      const errorMessage =
        error instanceof Error ? error.message : "Could not delete product.";

      setMessage("Error: " + errorMessage);
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

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#faf7f8]">
        <p>Checking admin access...</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#faf7f8] px-5">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
        >
          <h1 className="text-3xl font-bold text-[#43243b]">
            Oraia by Dara
          </h1>
          <p className="mt-2 mb-7 text-gray-500">Admin Login</p>

          <label className="mb-2 block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-5 w-full rounded-lg border p-3"
          />

          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-5 w-full rounded-lg border p-3"
          />

          {message && (
            <p className="mb-4 text-sm text-red-600">{message}</p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-[#43243b] p-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f8] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#43243b]">
              Oraia by Dara
            </h1>
            <p className="mt-1 text-gray-500">Product Management Dashboard</p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-[#43243b] px-5 py-2 text-[#43243b]"
          >
            Logout
          </button>
        </header>

        {message && (
          <div className="mb-6 rounded-lg bg-white p-4 text-sm text-[#43243b]">
            {message}
          </div>
        )}

        <section className="mb-10 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-6 text-xl font-bold text-[#43243b]">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <form onSubmit={saveProduct} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Product Name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
                className="w-full rounded-lg border p-3"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Price (₦)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                required
                className="w-full rounded-lg border p-3"
                placeholder="Enter price"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                required
                className="w-full rounded-lg border p-3"
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
              <label className="mb-2 block text-sm font-medium">
                Product Origin
              </label>
              <select
                value={form.origin}
                onChange={(e) =>
                  setForm({ ...form, origin: e.target.value })
                }
                className="w-full rounded-lg border p-3"
              >
                <option>In stock in Nigeria</option>
                <option>China preorder</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Product Photo
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImage(e.target.files?.[0] || null)
                }
                className="w-full rounded-lg border p-3"
              />
              {editingId && (
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to keep the current photo.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                className="w-full rounded-lg border p-3"
                placeholder="Describe this product..."
              />
            </div>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#43243b] px-7 py-3 font-semibold text-white disabled:opacity-50"
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
                  className="rounded-lg border px-7 py-3"
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
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Refresh Products
            </button>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-gray-500">
              No products added yet.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-gray-100 text-gray-400">
                      No product image
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="font-bold text-[#43243b]">
                      {product.name}
                    </h3>

                    <p className="mt-1 font-semibold">
                      ₦{Number(product.price).toLocaleString("en-NG")}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {product.category} · {product.origin}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
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
                        className="rounded-lg bg-[#43243b] px-4 py-2 text-sm text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleAvailability(product)}
                        className="rounded-lg border px-4 py-2 text-sm"
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
      </div>
    </main>
  );
}
