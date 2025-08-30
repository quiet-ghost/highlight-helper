"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    initials: string;
    cartNumber: string;
    orderNumber: string;
    cartLocation: string;
    binLocation: string;
    onHandQty: string;
    qtyMissing: string;
    pageType: "tackle" | "tennis" | "running";
    timestamp: string;
  }) => void;
  pageType: "tackle" | "tennis" | "running";
}

export default function Modal({ isOpen, onClose, onSubmit, pageType }: ModalProps) {
  const [formData, setFormData] = useState({
    initials: "",
    cartNumber: "",
    orderNumber: "",
    cartLocation: "",
    binLocation: "",
    onHandQty: "",
    qtyMissing: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString();
    onSubmit({ ...formData, pageType, timestamp });
    setFormData({
      initials: "",
      cartNumber: "",
      orderNumber: "",
      cartLocation: "",
      binLocation: "",
      onHandQty: "",
      qtyMissing: "",
    });
    onClose();
  };

  if (typeof window === "undefined" || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-950 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Missing Items Form</h2>
        <form onSubmit={handleSubmit}> {/* Attach handleSubmit here */}
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
            <label htmlFor="cartNumber" className="block font-bold text-white mb-1">
              Cart Number:
            </label>
            <input
              type="text"
              id="cartNumber"
              name="cartNumber"
              placeholder="Enter cart number"
              value={formData.cartNumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="orderNumber" className="block font-bold text-white mb-1">
              Order Number:
            </label>
            <input
              type="number"
              id="orderNumber"
              name="orderNumber"
              placeholder="Enter order number"
              value={formData.orderNumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="cartLocation" className="block font-bold text-white mb-1">
              Cart Position:
            </label>
            <input
              type="text"
              id="cartLocation"
              name="cartLocation"
              placeholder="Enter cart position"
              value={formData.cartLocation}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="binLocation" className="block font-bold text-white mb-1">
              Bin:
            </label>
            <input
              type="text"
              id="binLocation"
              name="binLocation"
              placeholder="Enter bin location"
              value={formData.binLocation}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="onHandQty" className="block font-bold text-white mb-1">
              On Hand Quantity:
            </label>
            <input
              type="number"
              id="onHandQty"
              name="onHandQty"
              placeholder="Enter on hand quantity"
              value={formData.onHandQty}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="qtyMissing" className="block font-bold text-white mb-1">
              Quantity Missing:
            </label>
            <input
              type="number"
              id="qtyMissing"
              name="qtyMissing"
              placeholder="Enter quantity missing"
              value={formData.qtyMissing}
              onChange={handleChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-red-900 text-white px-4 py-2 rounded hover:bg-red-500"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}