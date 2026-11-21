
"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  category: string | null;
  origin: string | null;
  quantity: number;
  image_path: string | null;
  is_active: boolean;
  imageUrl?: string;
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discount_percent: "0",
  category: "",
  origin: "China preorder",
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

const inputStyle =
  "w-full rounded-xl border border-[#eadce6] bg-white px-4 py-3 text-sm text-[#302331] outline-none focus:border-[#75436d]";

const labelStyle = "mb-2 block text-sm font-medium text-[#43243b]";

function money(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function discountedPrice(product: DropshipperProduct) {
  const discount = Math.min(
    100,
    Math.max(0, Number(product.discount_percent || 0))
  );

  return Number(product.price) * (1 - discount / 100);
}

export default function DropshipperProducts() {
  const [products, setProducts] = useState<DropshipperProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("dropshipper_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load dropshipper products: " + error.message);
      setLoading(false);
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
          price: Number(product.price),
          quantity: Number(product.quantity),
          discount_percent: Number(product.discount_percent || 0),
          imageUrl,
        };
      })
    );

    setProducts(items as DropshipperProduct[]);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setImage(null);
    setEditingId(null);

    const fileInput = document.getElementById(
      "dropshipper-product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  function startEditing(product: DropshipperProduct) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      discount_percent: String(product.discount_percent || 0),
      category: product.category || "",
      origin: product.origin || "China preorder",
      quantity: String(product.quantity),
    });

    setImage(null);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const discount = Number(form.discount_percent || 0);

    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Enter a valid product price.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setMessage("Enter a valid stock quantity.");
      return;
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setMessage("Discount must be between 0 and 100 percent.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const currentProduct = editingId
        ? products.find((product) => product.id === editingId)
        : null;

      let imagePath = currentProduct?.image_path || null;

      if (image) {
        const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const fileName = `dropshipper-${Date.now()}-${safeName}`;

        const { data: uploaded, error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(fileName, image, { upsert: false });

        if (uploadError) throw uploadError;

        imagePath = uploaded.path;
      }

      const productData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        discount_percent: discount,
        category: form.category || null,
        origin: form.origin || null,
        quantity,
        image_path: imagePath,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("dropshipper_products")
          .update(productData)
          .eq("id", editingId);

        if (error) throw error;

        if (image && currentProduct?.image_path) {
          await supabase.storage
            .from("product-images")
            .remove([currentProduct.image_path]);
        }

        setMessage("Dropshipper product updated successfully.");
      } else {
        const { error } = await supabase
          .from("dropshipper_products")
          .insert({
            ...productData,
            is_active: true,
          });

        if (error) throw error;

        setMessage("Dropshipper product added successfully.");
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      setMessage(
        "Could not save product: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability(product: DropshipperProduct) {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("dropshipper_products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setMessage("Could not update product: " + error.message);
    } else {
      setMessage("Product availability updated.");
      await loadProducts();
    }

    setLoading(false);
  }

  async function deleteProduct(product: DropshipperProduct) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from the dropshipper catalogue?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("dropshipper_products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      if (product.image_path) {
        await supabase.storage
          .from("product-images")
          .remove([product.image_path]);
      }

      if (editingId === product.id) resetForm();

      setMessage("Dropshipper product deleted.");
      await loadProducts();
    } catch (error) {
      setMessage(
        "Could not delete product: " +
          (error instanceof Error ? error.message : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#f0e2ec] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#43243b]">
            {editingId ? "Edit Dropshipper Product" : "Add Dropshipper Product"}
          </h2>

          <p className="mt-2 text-sm text-[#756574]">
            These products are stored separately from the regular ShopOraia
            customer catalogue.
          </p>
        </div>

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
            <label className={labelStyle}>Dropshipper Price (₦)</label>
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
            <label className={labelStyle}>Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discount_percent}
              onChange={(e) =>
                setForm({ ...form, discount_percent: e.target.value })
              }
              className={inputStyle}
            />

            {Number(form.price) > 0 &&
              Number(form.discount_percent) > 0 &&
              Number(form.discount_percent) <= 100 && (
                <p className="mt-2 text-sm font-semibold text-green-700">
                  Price after discount:{" "}
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
              <option>China preorder</option>
              <option>In stock in Nigeria</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className={labelStyle}>Available Quantity</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
              required
              className={inputStyle}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelStyle}>Product Photo</label>
            <input
              id="dropshipper-product-image"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImage(e.target.files?.[0] || null)
              }
              className={inputStyle}
            />

            {editingId && (
              <p className="mt-1 text-xs text-[#756574]">
                Leave empty to keep the existing photo.
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
                  : "Add Dropshipper Product"}
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
          <div>
            <h2 className="text-xl font-bold text-[#43243b]">
              Dropshipper Catalogue ({products.length})
            </h2>
            <p className="mt-1 text-sm text-[#756574]">
              This catalogue is separate from regular customer products.
            </p>
          </div>

          <button
            onClick={loadProducts}
            disabled={loading}
            className="rounded-xl border border-[#eadce6] bg-white px-4 py-2 text-sm text-[#43243b] disabled:opacity-50"
          >
            Refresh Products
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-[#eadce6] bg-white p-4 text-sm text-[#43243b]">
            {message}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-[#756574]">
            Loading dropshipper products...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-[#756574]">
            No dropshipper products added yet.
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
                    {product.category || "Uncategorised"} ·{" "}
                    {product.origin || "Origin not set"}
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
                      disabled={loading}
                      className="rounded-lg border border-[#eadce6] px-4 py-2 text-sm text-[#43243b] disabled:opacity-50"
                    >
                      {product.is_active ? "Hide" : "Show"}
                    </button>

                    <button
                      onClick={() => deleteProduct(product)}
                      disabled={loading}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
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
  );
}
