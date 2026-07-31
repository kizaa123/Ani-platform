"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export interface CustomProductInputProps {
  products: string[];
  onChange: (products: string[]) => void;
  invalid?: boolean;
  idPrefix?: string;
}

export function CustomProductInput({
  products,
  onChange,
  invalid = false,
  idPrefix = "product",
}: CustomProductInputProps) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");

  const addProduct = () => {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setInputError("Product name must be at least 2 characters");
      return;
    }
    if (products.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setInputError("This product is already added");
      return;
    }
    setInputError("");
    onChange([...products, trimmed]);
    setInput("");
  };

  const removeProduct = (index: number) => {
    onChange(products.filter((_, i) => i !== index));
  };

  const inputId = `${idPrefix}-input`;

  return (
    <div
      className={`space-y-4 ${invalid ? "rounded-xl border border-red-500 bg-red-50/30 p-4" : ""}`}
    >
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-900">
          Type your products
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addProduct();
              }
            }}
            placeholder="e.g. Organic honey, Dried mango…"
            maxLength={100}
            className={`min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 ${
              invalid
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-brand-200 focus:border-brand-500 focus:ring-brand-200"
            }`}
          />
          <button
            type="button"
            onClick={addProduct}
            disabled={!input.trim()}
            className="shrink-0 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {inputError && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {inputError}
          </p>
        )}
        <p className="mt-1.5 text-sm text-gray-500">
          Press Enter or click Add for each product you produce.
        </p>
      </div>

      {products.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-brand-800">
            Added ({products.length})
          </p>
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((product, index) => (
              <span
                key={`${product}-${index}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
              >
                <Icon name="leaf" className="h-3.5 w-3.5 text-brand-600" />
                <span className="whitespace-nowrap">{product}</span>
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="ml-0.5 shrink-0 text-red-500 hover:text-red-700"
                  aria-label={`Remove ${product}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <p className="text-sm text-gray-500">Add at least one product using the field above.</p>
      )}
    </div>
  );
}
