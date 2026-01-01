import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Saira } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { SidebarProvider } from "@/components/providers/SidebarProvider";

const montserrat = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const saira = Saira({
  subsets: ["latin"],
  variable: "--font-saira",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CasperGroup-Splits - Split Expenses with Staking Rewards",
  description: "Join group escrows, pool CSPR for shared expenses, and earn staking rewards automatically with CasperGroup-Splits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${saira.variable}`}>
      <body className={`${montserrat.className} bg-gray-950 text-gray-100`}>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar - Fixed left */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Header */}
              <Header />

              {/* Page Content - Scrollable */}
              <main className="flex-1 overflow-y-auto scrollbar-thin p-8 bg-gray-950">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
