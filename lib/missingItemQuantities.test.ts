import { describe, expect, it } from "vitest";
import { MissingItemQuantities } from "./missingItemQuantities";

describe("MissingItemQuantities", () => {
  it.each(["-2147483648", "0", "2147483647"])(
    "accepts on-hand PostgreSQL integer %s",
    (onHand) => {
      expect(
        MissingItemQuantities.parse({
          on_hand_qty: onHand,
          qty_missing: "1",
        }),
      ).toEqual({
        ok: true,
        value: {
          on_hand_qty: Number(onHand),
          qty_missing: 1,
        },
      });
    },
  );

  it.each(["1", "2147483647"])(
    "accepts positive missing quantity %s",
    (missing) => {
      expect(
        MissingItemQuantities.parse({
          on_hand_qty: "0",
          qty_missing: missing,
        }),
      ).toEqual({
        ok: true,
        value: {
          on_hand_qty: 0,
          qty_missing: Number(missing),
        },
      });
    },
  );

  it.each([
    ["", "required"],
    ["1.5", "not_integer"],
    ["1e3", "not_integer"],
    ["2147483648", "out_of_range"],
    ["-2147483649", "out_of_range"],
  ])("rejects invalid on-hand quantity %j", (onHand, code) => {
    expect(
      MissingItemQuantities.parse({
        on_hand_qty: onHand,
        qty_missing: "1",
      }),
    ).toMatchObject({
      ok: false,
      error: { field: "on_hand_qty", code },
    });
  });

  it.each([
    ["", "required"],
    ["0", "not_positive"],
    ["-1", "not_positive"],
    ["1.5", "not_integer"],
    ["1e3", "not_integer"],
    ["2147483648", "out_of_range"],
  ])("rejects invalid missing quantity %j", (missing, code) => {
    expect(
      MissingItemQuantities.parse({
        on_hand_qty: "0",
        qty_missing: missing,
      }),
    ).toMatchObject({
      ok: false,
      error: { field: "qty_missing", code },
    });
  });

  it("rejects invalid runtime values before persistence", () => {
    expect(
      MissingItemQuantities.validate({
        on_hand_qty: Number.NaN,
        qty_missing: 1,
      }),
    ).toMatchObject({
      ok: false,
      error: { field: "on_hand_qty", code: "not_integer" },
    });

    expect(
      MissingItemQuantities.validate({
        on_hand_qty: 0,
        qty_missing: 0,
      }),
    ).toMatchObject({
      ok: false,
      error: { field: "qty_missing", code: "not_positive" },
    });
  });
});
