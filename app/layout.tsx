import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Group Escrow - Split Expenses with Staking Rewards",
  description: "Join group escrows, pool CSPR for shared expenses, and earn staking rewards automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-950 text-gray-100">
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
      </body>
    </html>
  );
}
