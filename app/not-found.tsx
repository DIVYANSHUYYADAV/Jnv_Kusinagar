import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-4">🔍</div>
      <h1 className="text-4xl font-black mb-2 font-display gradient-text">404 — Not Found</h1>
      <p className="text-gray-400 mb-8">This page doesn't exist or the game has expired.</p>
      <Link href="/" className="btn-primary py-3 px-8 rounded-xl">← Back to Home</Link>
      <p className="text-gray-600 text-xs mt-8">Cograd Quest · Developed by Divyanshu</p>
    </div>
  );
}
