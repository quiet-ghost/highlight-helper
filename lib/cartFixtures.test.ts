import { describe, expect, it } from "vitest";
import { inlineCarts } from "./inlineCarts";
import { runningList } from "./runningCarts";
import {
  bulkyList,
  hugeList,
  rodBoxesList,
  rodCartsList,
  smallsList,
} from "./tacCarts";
import { tennisCarts } from "./tennisCarts";

const warehouseCarts = [
  [
    "tackle",
    [...bulkyList, ...smallsList, ...hugeList, ...rodCartsList, ...rodBoxesList],
  ],
  ["tennis", tennisCarts],
  ["running", runningList],
  ["inline", inlineCarts],
] as const;

describe("warehouse cart fixtures", () => {
  it.each(warehouseCarts)(
    "%s has unique cart numbers and scan IDs",
    (_warehouse, carts) => {
      expect(new Set(carts.map((cart) => cart.number)).size).toBe(carts.length);
      expect(new Set(carts.map((cart) => cart.id)).size).toBe(carts.length);
    },
  );

  it("maps tackle carts 256 and 299 to separate scan IDs", () => {
    expect(bulkyList.find((cart) => cart.number === "256")?.id).toBe("B54");
    expect(bulkyList.find((cart) => cart.number === "299")?.id).toBe("B55");
  });
});
