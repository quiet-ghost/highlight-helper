export type PageType = "tackle" | "tennis" | "running" | "inline";

export const PageType = {
  values: ["tackle", "tennis", "running", "inline"] as const,
  parse(value: string | null): PageType | null {
    if (
      value === "tackle" ||
      value === "tennis" ||
      value === "running" ||
      value === "inline"
    ) {
      return value;
    }
    return null;
  },
} as const;
