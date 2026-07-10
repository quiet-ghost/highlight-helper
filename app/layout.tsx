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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("dark-mode")==="enabled")document.documentElement.classList.add("dark")}catch{}',
          }}
        />
      </head>
      <body>
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
