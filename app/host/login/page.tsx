"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loginAdmin, getAdminSession, getAdminCredentials } from "@/lib/adminAuth";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getAdminSession()) {
      router.replace("/host");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = loginAdmin(identifier, password);
      if (res.success) {
        toast.success(`Welcome back, ${res.user?.name}! 👑`);
        router.push("/host");
      } else {
        toast.error(res.error || "Authentication failed");
        setLoading(false);
      }
    }, 400);
  };

  const handleQuickFill = () => {
    const creds = getAdminCredentials();
    setIdentifier(creds.email);
    setPassword(creds.hintPassword);
    toast("Credentials auto-filled! Click Sign In.", { icon: "✨" });
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      {/* Header back link */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
          <span>←</span> Back to Home
        </Link>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-lg bg-blue-500/30" />
              <Image
                src="/images/cograd-logo.jpeg"
                alt="Cograd"
                width={160}
                height={55}
                className="relative h-12 w-auto object-contain rounded-xl"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>🔒</span> Admin Portal
          </div>
          <h1 className="text-3xl font-black font-display gradient-text">Host Authorization</h1>
          <p className="text-gray-400 text-sm mt-1">
            Only authorized administrators can host live quiz games.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Admin Username or Email
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="admin@cograd.in"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-base transition-all"
              style={{ background: "linear-gradient(135deg,#1A3FD8,#7C3AED)" }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>👑</span>
                  <span>Sign In as Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helper */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400 mb-2">Default Admin Credentials:</p>
            <div className="bg-white/5 rounded-lg p-2.5 text-xs text-gray-300 font-mono flex items-center justify-between mb-3 border border-white/5">
              <span>admin@cograd.in / cograd123</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-blue-400 hover:text-blue-300 font-sans font-semibold underline text-xs"
              >
                Auto Fill
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-gray-500">
          Developed by Divyanshu · Powered by Cograd
        </div>
      </div>
    </main>
  );
}
