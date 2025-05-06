"use client";

import { PostgrestError } from "@supabase/supabase-js"; // Import Supabase error type
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { saveMissingItem } from "../../lib/missingItems";

// Component that uses useSearchParams
function ReportMissingContent() {
  const searchParams = useSearchParams();
  const initialPageType = searchParams.get("pageType") || "default";
  const [formData, setFormData] = useState({
    initials: "",
    cart_number: "",
    order_number: "",
    cart_location: "",
    bin_location: "",
    on_hand_qty: "",
    qty_missing: "",
    description: "",
    page_type: initialPageType as "tackle" | "tennis" | "running",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Submitting formData:", formData);
      await saveMissingItem({
        initials: formData.initials,
        cart_number: formData.cart_number,
        order_number: formData.order_number,
        cart_location: formData.cart_location,
        bin_location: formData.bin_location,
        on_hand_qty: parseInt(formData.on_hand_qty) || 0, // Parse to number
        qty_missing: parseInt(formData.qty_missing) || 0, // Parse to number
        description: formData.description || undefined, // Handle optional field
        page_type: formData.page_type,
      });
      setFormData({
        initials: "",
        cart_number: "",
        order_number: "",
        cart_location: "",
        bin_location: "",
        on_hand_qty: "",
        qty_missing: "",
        description: "",
        page_type: formData.page_type,
      });
      setError(null);
      setIsModalOpen(true);
    } catch (err: unknown) {
      // Narrowing the type inside the block
      if (err instanceof Error || (err as PostgrestError).message) {
        const message =
          (err as PostgrestError | Error).message || "Unknown error";
        console.error("Submission error:", message);
        setError(`Failed to submit: ${message}`);
      } else {
        console.error("Unexpected error:", err);
        setError("Failed to submit: An unexpected error occurred");
      }
    }
  };

  const modalContent = isModalOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-white">Item Submitted</h2>
        <p className="mb-4 text-white">Missing item reported successfully!</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Add Another
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="container flex items-center justify-center min-h-screen p-5">
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-center text-white">
          Report Missing Items
        </h1>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="page_type"
              className="block mb-1 font-bold text-white"
            >
              Warehouse:
            </label>
            <select
              id="page_type"
              name="page_type"
              required
              value={formData.page_type}
              onChange={handleChange}
              className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded"
            >
              <option value="default">-- Select a Company --</option>
              <option value="tackle">Tackle Warehouse</option>
              <option value="tennis">Tennis Warehouse</option>
              <option value="running">Running Warehouse</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              htmlFor="initials"
              className="block mb-1 font-bold text-white"
            >
              Initials:
            </label>
            <input
              type="text"
              id="initials"
              name="initials"
              placeholder="Enter your initials"
              value={formData.initials}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 uppercase bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="cart_number"
              className="block mb-1 font-bold text-white"
            >
              Cart Number:
            </label>
            <input
              type="text"
              id="cart_number"
              name="cart_number"
              placeholder="Enter cart number"
              value={formData.cart_number}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="order_number"
              className="block mb-1 font-bold text-white"
            >
              Order Number:
            </label>
            <input
              type="number"
              id="order_number"
              name="order_number"
              placeholder="Enter order number"
              value={formData.order_number}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="cart_location"
              className="block mb-1 font-bold text-white"
            >
              Cart Position:
            </label>
            <input
              type="text"
              id="cart_location"
              name="cart_location"
              placeholder="Enter cart position"
              value={formData.cart_location}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="bin_location"
              className="block mb-1 font-bold text-white"
            >
              Bin:
            </label>
            <input
              type="text"
              id="bin_location"
              name="bin_location"
              placeholder="Enter bin location"
              value={formData.bin_location}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 uppercase bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="on_hand_qty"
              className="block mb-1 font-bold text-white"
            >
              On Hand Quantity:
            </label>
            <input
              type="number"
              id="on_hand_qty"
              name="on_hand_qty"
              placeholder="Enter on hand quantity"
              value={formData.on_hand_qty}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="qty_missing"
              className="block mb-1 font-bold text-white"
            >
              Quantity Missing:
            </label>
            <input
              type="number"
              id="qty_missing"
              name="qty_missing"
              placeholder="Enter quantity missing"
              value={formData.qty_missing}
              onChange={handleChange}
              className="w-full p-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block mb-1 font-bold text-white"
            >
              Item Description:
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Enter item description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 min-h-[100px]"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </div>
  );
}

// Wrapper with Suspense
export default function ReportMissingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportMissingContent />
    </Suspense>
  );
}
