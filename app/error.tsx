"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-4">⚠️</div>
      <h1 className="text-4xl font-black mb-2 font-display text-red-400">Something went wrong</h1>
      <p className="text-gray-400 mb-2">{error.message}</p>
      <p className="text-gray-600 text-sm mb-8">Check your Firebase configuration in .env.local</p>
      <button onClick={reset} className="btn-primary py-3 px-8 rounded-xl">Try Again</button>
    </div>
  );
}
