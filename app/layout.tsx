import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ninja Zone",
  description: "Ninja Zone Gaming Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
