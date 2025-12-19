import type { Metadata } from "next";
import { ClientBody } from "./ClientBody";

export const metadata: Metadata = {
  title: "Highlight Helper",
  description:
    "A Highlight Management Tool for Tackle, Tennis, and Running Warehouse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
