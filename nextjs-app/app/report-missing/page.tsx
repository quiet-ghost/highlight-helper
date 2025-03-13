"use client";

import { PostgrestError } from "@supabase/supabase-js"; // Import Supabase error type
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { saveMissingItem } from "../../lib/missingItems";

// Component that uses useSearchParams
function ReportMissingContent() {
  const searchParams = useSearchParams();
  const initialPageType = searchParams.get("pageType") || "tackle";
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Submitting formData:", formData);
      await saveMissingItem(formData);
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
        const message = (err as PostgrestError | Error).message || "Unknown error";
        console.error("Submission error:", message);
        setError(`Failed to submit: ${message}`);
      } else {
        console.error("Unexpected error:", err);
        setError("Failed to submit: An unexpected error occurred");
      }
    }
  };


  const modalContent = isModalOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-4">Item Submitted</h2>
        <p className="text-white mb-4">Missing item reported successfully!</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setIsModalOpen(false)}
            className="bg-blue-500 text-white px-4 py-2 rounded font-bold hover:bg-blue-600"
          >
            Add Another
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="container p-5 min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4 text-center">
          Report Missing Items
        </h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="page_type" className="block font-bold text-white mb-1">
              Warehouse:
            </label>
            <select
              id="page_type"
              name="page_type"
              value={formData.page_type}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
            >
              <option value="tackle">Tackle Warehouse</option>
              <option value="tennis">Tennis Warehouse</option>
              <option value="running">Running Warehouse</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="initials" className="block font-bold text-white mb-1">
              Initials:
            </label>
            <input
              type="text"
              id="initials"
              name="initials"
              placeholder="Enter your initials"
              value={formData.initials}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="cart_number" className="block font-bold text-white mb-1">
              Cart Number:
            </label>
            <input
              type="text"
              id="cart_number"
              name="cart_number"
              placeholder="Enter cart number"
              value={formData.cart_number}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="order_number" className="block font-bold text-white mb-1">
              Order Number:
            </label>
            <input
              type="number"
              id="order_number"
              name="order_number"
              placeholder="Enter order number"
              value={formData.order_number}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="cart_location" className="block font-bold text-white mb-1">
              Cart Position:
            </label>
            <input
              type="text"
              id="cart_location"
              name="cart_location"
              placeholder="Enter cart position"
              value={formData.cart_location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="bin_location" className="block font-bold text-white mb-1">
              Bin:
            </label>
            <input
              type="text"
              id="bin_location"
              name="bin_location"
              placeholder="Enter bin location"
              value={formData.bin_location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="on_hand_qty" className="block font-bold text-white mb-1">
              On Hand Quantity:
            </label>
            <input
              type="number"
              id="on_hand_qty"
              name="on_hand_qty"
              placeholder="Enter on hand quantity"
              value={formData.on_hand_qty}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="qty_missing" className="block font-bold text-white mb-1">
              Quantity Missing:
            </label>
            <input
              type="number"
              id="qty_missing"
              name="qty_missing"
              placeholder="Enter quantity missing"
              value={formData.qty_missing}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block font-bold text-white mb-1">
              Description:
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Enter a description (optional)"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 min-h-[100px]"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded font-bold hover:bg-blue-600"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
      {typeof window !== "undefined" && modalContent && createPortal(modalContent, document.body)}
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