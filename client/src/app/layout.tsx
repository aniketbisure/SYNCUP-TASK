import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SYNCUP | Real-Time Coaching Feed",
  description: "Experience premium, live coaching updates at your fingertips with Redis caching and Socket.IO real-time synchronization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-violet-500/30 selection:text-violet-200">
        <SocketProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </SocketProvider>
      </body>
    </html>
  );
}
