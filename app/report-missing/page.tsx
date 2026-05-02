"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Modal from "../../components/Modal";
import {
  NewMissingItem,
  PageType,
  saveMissingItems,
} from "../../lib/missingItems";

interface QueuedItem {
  order_number: string;
  cart_location: string;
  bin_location: string;
  on_hand_qty: string;
  qty_missing: string;
  description: string;
}

interface ReportFormData extends QueuedItem {
  initials: string;
  cart_number: string;
  page_type: PageType | "";
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = err.message;
    if (typeof message === "string") return message;
  }
  return "An unexpected error occurred";
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

// Component that uses useSearchParams
function ReportMissingContent() {
  const searchParams = useSearchParams();
  const initialPageType = PageType.parse(searchParams.get("pageType"));
  const [formData, setFormData] = useState<ReportFormData>({
    initials: "",
    cart_number: "",
    order_number: "",
    cart_location: "",
    bin_location: "",
    on_hand_qty: "",
    qty_missing: "",
    description: "",
    page_type: initialPageType ?? "",
  });
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [hasSetCommonData, setHasSetCommonData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "page_type") {
      setFormData((prev) => ({
        ...prev,
        page_type: PageType.parse(value) ?? "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateCommonFields = () => {
    if (!formData.page_type) return "Select a warehouse before adding items.";
    if (!isFilled(formData.initials)) return "Enter initials before adding items.";
    if (!isFilled(formData.cart_number)) return "Enter a cart number before adding items.";
    return null;
  };

  const hasCurrentItemFields = () =>
    isFilled(formData.order_number) ||
    isFilled(formData.cart_location) ||
    isFilled(formData.bin_location) ||
    isFilled(formData.on_hand_qty) ||
    isFilled(formData.qty_missing) ||
    isFilled(formData.description);

  const validateItemFields = () => {
    const commonError = validateCommonFields();
    if (commonError) return commonError;
    if (!isFilled(formData.order_number)) {
      return "Enter an order number before adding items.";
    }
    if (!isFilled(formData.cart_location)) {
      return "Enter a cart position before adding items.";
    }
    if (!isFilled(formData.bin_location)) return "Enter a bin before adding items.";
    if (!isFilled(formData.on_hand_qty)) {
      return "Enter an on hand quantity before adding items.";
    }
    if (!isFilled(formData.qty_missing)) {
      return "Enter a quantity missing before adding items.";
    }
    if (!isFilled(formData.description)) {
      return "Enter an item description before adding items.";
    }
    return null;
  };

  const addItem = () => {
    const validationError = validateItemFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Queue the current item
    const newItem: QueuedItem = {
      order_number: formData.order_number,
      cart_location: formData.cart_location,
      bin_location: formData.bin_location,
      on_hand_qty: formData.on_hand_qty,
      qty_missing: formData.qty_missing,
      description: formData.description,
    };

    setQueuedItems((prev) => [...prev, newItem]);
    setHasSetCommonData(true);
    setError(null);

    // Clear only the item-specific fields
    setFormData((prev) => ({
      ...prev,
      order_number: "",
      cart_location: "",
      bin_location: "",
      on_hand_qty: "",
      qty_missing: "",
      description: "",
    }));
  };

  const removeQueuedItem = (index: number) => {
    setQueuedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const commonError = validateCommonFields();
      if (commonError) {
        setError(commonError);
        return;
      }

      if (!formData.page_type) {
        setError("Select a warehouse before submitting items.");
        return;
      }

      const hasCurrentItem = hasCurrentItemFields();
      if (!hasCurrentItem && queuedItems.length === 0) {
        setError("Enter item details before submitting items.");
        return;
      }

      if (hasCurrentItem) {
        const validationError = validateItemFields();
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      const pageType = formData.page_type;

      const currentItems: NewMissingItem[] = hasCurrentItem
        ? [
            {
              initials: formData.initials,
              cart_number: formData.cart_number,
              order_number: formData.order_number,
              cart_location: formData.cart_location,
              bin_location: formData.bin_location,
              on_hand_qty: parseInt(formData.on_hand_qty) || 0,
              qty_missing: parseInt(formData.qty_missing) || 0,
              description: formData.description || undefined,
              page_type: pageType,
              on_cart: false,
              looked_for: false,
              fulf_1: false,
              fulf_2: false,
            },
          ]
        : [];

      const queuedMissingItems: NewMissingItem[] = queuedItems.map((item) => ({
        initials: formData.initials,
        cart_number: formData.cart_number,
        order_number: item.order_number,
        cart_location: item.cart_location,
        bin_location: item.bin_location,
        on_hand_qty: parseInt(item.on_hand_qty) || 0,
        qty_missing: parseInt(item.qty_missing) || 0,
        description: item.description || undefined,
        page_type: pageType,
        on_cart: false,
        looked_for: false,
        fulf_1: false,
        fulf_2: false,
      }));

      await saveMissingItems([...currentItems, ...queuedMissingItems]);

      // Reset form
      setFormData({
        initials: "",
        cart_number: "",
        order_number: "",
        cart_location: "",
        bin_location: "",
        on_hand_qty: "",
        qty_missing: "",
        description: "",
        page_type: pageType,
      });
      setQueuedItems([]);
      setHasSetCommonData(false);
      setError(null);
      setIsModalOpen(true);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("Submission error:", message);
      setError(`Failed to submit: ${message}`);
    }
  };

  const currentItemRequired = queuedItems.length === 0 || hasCurrentItemFields();
  const submitItemCount =
    queuedItems.length + (hasCurrentItemFields() ? 1 : 0);

  return (
    <div className="container flex items-center justify-center min-h-screen p-5">
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-center text-white">
          Report Missing Items
        </h1>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        {/* Show queued items if any */}
        {queuedItems.length > 0 && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <h3 className="mb-2 text-sm font-bold text-white">
              Queued Items ({queuedItems.length})
            </h3>
            <div className="space-y-2">
              {queuedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-gray-600 rounded text-sm"
                >
                  <span className="text-white truncate">
                    Order #{item.order_number} -{" "}
                    {item.description.substring(0, 30)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQueuedItem(index)}
                    className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!hasSetCommonData && (
            <>
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
                  <option value="" disabled>
                    -- Select a Company --
                  </option>
                  <option value="tackle">Tackle Warehouse</option>
                  <option value="tennis">Tennis Warehouse</option>
                  <option value="running">Running Warehouse</option>
                  <option value="inline">Inline Warehouse</option>
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
            </>
          )}

          {hasSetCommonData && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">
                <strong>Initials:</strong> {formData.initials} |{" "}
                <strong>Cart:</strong> {formData.cart_number}
              </p>
            </div>
          )}

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
              required={currentItemRequired}
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
              required={currentItemRequired}
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
              required={currentItemRequired}
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
              required={currentItemRequired}
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
              required={currentItemRequired}
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
              required={currentItemRequired}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-600"
            >
              Add Item
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
            >
              Submit
              {queuedItems.length > 0 ? ` All (${submitItemCount})` : ""}
            </button>
          </div>
        </form>
      </div>
      <Modal
        isOpen={isModalOpen}
        title="Items Submitted"
        onClose={() => setIsModalOpen(false)}
        footer={
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Add More Items
          </button>
        }
      >
        All missing items reported successfully!
      </Modal>
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
