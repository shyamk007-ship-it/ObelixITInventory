import "./globals.css";

export const metadata = {
  title: "IT Management",
  description: "IT Management System",
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