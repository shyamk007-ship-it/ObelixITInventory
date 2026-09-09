import "./globals.css";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import { EnterpriseAccessProvider } from "./components/shared/EnterpriseAccessProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

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
      <body className={`${inter.variable} ${manrope.variable} ${jetBrainsMono.variable}`}>
        <EnterpriseAccessProvider>{children}</EnterpriseAccessProvider>
      </body>
    </html>
  );
}