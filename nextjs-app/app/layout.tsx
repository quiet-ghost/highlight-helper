import type { Metadata } from "next";
import GlobalNav from "../components/GlobalNav";
import { AuthProvider } from "../lib/authContext";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Highlight Helper",
  description: "A Highlight Management Tool for Tackle, Tennis, and Running Warehouse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GlobalNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}