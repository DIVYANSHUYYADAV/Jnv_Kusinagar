import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Cograd Quest — Learn. Think. Compete.",
  description: "The ultimate multiplayer educational quiz game by Cograd. Host live quizzes, compete with classmates, and make learning fun!",
  keywords: ["quiz game", "educational game", "cograd", "multiplayer quiz", "classroom game"],
  authors: [{ name: "Divyanshu", url: "https://cograd.in" }],
  openGraph: {
    title: "Cograd Quest",
    description: "Learn. Think. Compete.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0A0E27" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(15,23,42,0.95)",
              color: "white",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              backdropFilter: "blur(20px)",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "white" } },
            error: { iconTheme: { primary: "#EF4444", secondary: "white" } },
          }}
        />
        {/* Developer Watermark */}
        <div className="dev-watermark">Built with ❤️ by Divyanshu</div>
      </body>
    </html>
  );
}
