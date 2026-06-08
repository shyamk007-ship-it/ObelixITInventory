import "./globals.css";

export const metadata = {
  title: "IT Inventory",
  description: "IT Asset Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}