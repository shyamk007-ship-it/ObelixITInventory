import "./globals.css";
import { EnterpriseAccessProvider } from "./components/shared/EnterpriseAccessProvider";

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
      <body>
        <EnterpriseAccessProvider>{children}</EnterpriseAccessProvider>
      </body>
    </html>
  );
}