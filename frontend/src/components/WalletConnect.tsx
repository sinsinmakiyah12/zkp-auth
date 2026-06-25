"use client";

import { useState } from "react";
import { connectWallet } from "@/lib/blockchain";

interface Props {
  onConnected: (address: string) => void;
  address: string;
}

export default function WalletConnect({ onConnected, address }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const addr = await connectWallet();
      onConnected(addr);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (address) {
    return (
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-xs font-mono text-gray-300">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
      >
        {loading ? (
          <span className="animate-pulse">Menghubungkan...</span>
        ) : (
          <>🦊 Hubungkan Wallet</>
        )}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
