"use client";

import { useState } from "react";
import RegisterForm from "@/components/RegisterForm";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";
import WalletConnect from "@/components/WalletConnect";

export type AuthState = "idle" | "register" | "login" | "dashboard";

export interface UserSession {
  username: string;
  address: string;
  loginTime: Date;
}

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [session, setSession] = useState<UserSession | null>(null);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
  };

  const handleLoginSuccess = (username: string) => {
    setSession({
      username,
      address: walletAddress,
      loginTime: new Date(),
    });
    setAuthState("dashboard");
  };

  const handleLogout = () => {
    setSession(null);
    setAuthState("idle");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-indigo-900/30 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold">
                ZK
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">ZKP Auth System</h1>
                <p className="text-xs text-indigo-400">Zero-Knowledge Proof Authentication</p>
              </div>
            </div>
            <WalletConnect onConnected={handleWalletConnected} address={walletAddress} />
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {authState === "dashboard" && session ? (
            <Dashboard session={session} onLogout={handleLogout} />
          ) : (
            <>
              {/* Hero Section */}
              {authState === "idle" && (
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-800/50 rounded-full px-4 py-1.5 text-xs text-indigo-300 mb-6">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Blockchain-Powered • Password Never Leaves Your Device
                  </div>
                  
                  <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent leading-tight">
                    Autentikasi Tanpa<br />Membocorkan Password
                  </h2>
                  
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12">
                    Sistem login berbasis <strong className="text-indigo-300">Zero-Knowledge Proof</strong>. 
                    Server blockchain memverifikasi identitasmu tanpa pernah mengetahui passwordmu.
                  </p>

                  {/* ZKP Flow Diagram */}
                  <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
                    {[
                      { step: "01", title: "Input Password", desc: "Password diproses di browser kamu, tidak pernah dikirim ke mana pun", icon: "🔐" },
                      { step: "02", title: "Generate Proof", desc: "Circom circuit menghasilkan ZK Proof bahwa kamu tahu passwordnya", icon: "⚡" },
                      { step: "03", title: "Verify On-Chain", desc: "Smart contract memverifikasi proof tanpa melihat password asli", icon: "✅" },
                    ].map((item) => (
                      <div key={item.step} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 text-left">
                        <div className="text-2xl mb-3">{item.icon}</div>
                        <div className="text-xs text-indigo-400 font-mono mb-1">STEP {item.step}</div>
                        <div className="text-sm font-semibold mb-2">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setAuthState("register")}
                      disabled={!walletAddress}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold transition-all text-sm"
                    >
                      Daftar Sekarang
                    </button>
                    <button
                      onClick={() => setAuthState("login")}
                      disabled={!walletAddress}
                      className="px-8 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold transition-all text-sm border border-gray-700"
                    >
                      Login
                    </button>
                  </div>
                  
                  {!walletAddress && (
                    <p className="text-xs text-yellow-500/70 mt-4">
                      ⚠️ Hubungkan MetaMask terlebih dahulu untuk menggunakan aplikasi
                    </p>
                  )}
                </div>
              )}

              {/* Forms */}
              {authState === "register" && (
                <RegisterForm
                  walletAddress={walletAddress}
                  onSuccess={() => setAuthState("login")}
                  onBack={() => setAuthState("idle")}
                />
              )}

              {authState === "login" && (
                <LoginForm
                  walletAddress={walletAddress}
                  onSuccess={handleLoginSuccess}
                  onBack={() => setAuthState("idle")}
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
