const POSTGRES_INTEGER_MIN = -2147483648;
const POSTGRES_INTEGER_MAX = 2147483647;

export type MissingItemQuantities = {
  readonly on_hand_qty: number;
  readonly qty_missing: number;
};

type QuantityField = keyof MissingItemQuantities;

type QuantityErrorCode =
  | "required"
  | "not_integer"
  | "out_of_range"
  | "not_positive";

export type QuantityValidationError = {
  readonly field: QuantityField;
  readonly code: QuantityErrorCode;
  readonly message: string;
};

type QuantityResult =
  | { readonly ok: true; readonly value: MissingItemQuantities }
  | { readonly ok: false; readonly error: QuantityValidationError };

function getFieldLabel(field: QuantityField) {
  return field === "on_hand_qty" ? "On hand quantity" : "Quantity missing";
}

function failure(
  field: QuantityField,
  code: QuantityErrorCode,
): { readonly ok: false; readonly error: QuantityValidationError } {
  const label = getFieldLabel(field);
  const message = {
    required: `Enter ${label.toLowerCase()}.`,
    not_integer: `${label} must be a whole number.`,
    out_of_range: `${label} must be between ${POSTGRES_INTEGER_MIN} and ${POSTGRES_INTEGER_MAX}.`,
    not_positive: `${label} must be greater than zero.`,
  }[code];

  return { ok: false, error: { field, code, message } };
}

function validateInteger(field: QuantityField, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return failure(field, "not_integer");
  }
  if (value < POSTGRES_INTEGER_MIN || value > POSTGRES_INTEGER_MAX) {
    return failure(field, "out_of_range");
  }
  if (field === "qty_missing" && value <= 0) {
    return failure(field, "not_positive");
  }
  return { ok: true, value } as const;
}

function parseInteger(field: QuantityField, rawValue: string) {
  const value = rawValue.trim();
  if (!value) return failure(field, "required");
  if (!/^-?\d+$/.test(value)) return failure(field, "not_integer");
  return validateInteger(field, Number(value));
}

function parse(input: {
  readonly on_hand_qty: string;
  readonly qty_missing: string;
}): QuantityResult {
  const onHand = parseInteger("on_hand_qty", input.on_hand_qty);
  if (!onHand.ok) return onHand;

  const missing = parseInteger("qty_missing", input.qty_missing);
  if (!missing.ok) return missing;

  return {
    ok: true,
    value: {
      on_hand_qty: onHand.value,
      qty_missing: missing.value,
    },
  };
}

function validate(input: {
  readonly on_hand_qty: unknown;
  readonly qty_missing: unknown;
}): QuantityResult {
  const onHand = validateInteger("on_hand_qty", input.on_hand_qty);
  if (!onHand.ok) return onHand;

  const missing = validateInteger("qty_missing", input.qty_missing);
  if (!missing.ok) return missing;

  return {
    ok: true,
    value: {
      on_hand_qty: onHand.value,
      qty_missing: missing.value,
    },
  };
}

export const MissingItemQuantities = { parse, validate } as const;
