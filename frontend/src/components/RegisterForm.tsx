"use client";

import { useState } from "react";
import { generateSalt, poseidonHash, passwordToField } from "@/lib/zkp";
import { registerOnChain, checkUsernameAvailable } from "@/lib/blockchain";

interface Props {
  walletAddress: string;
  onSuccess: () => void;
  onBack: () => void;
}

type Step = "form" | "hashing" | "blockchain" | "done";

export default function RegisterForm({ walletAddress, onSuccess, onBack }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleRegister = async () => {
    setError("");
    setLogs([]);

    // Validasi
    if (!username.trim()) return setError("Username tidak boleh kosong");
    if (username.length < 3) return setError("Username minimal 3 karakter");
    if (!password) return setError("Password tidak boleh kosong");
    if (password.length < 6) return setError("Password minimal 6 karakter");
    if (password !== confirmPassword) return setError("Konfirmasi password tidak cocok");

    try {
      // Step 1: Hashing password (ZKP Logic)
      setStep("hashing");
      addLog("🔐 Mengkonversi password ke field element...");
      const passwordField = passwordToField(password);
      addLog(`✓ Password field: ${passwordField.toString().slice(0, 20)}...`);

      addLog("🧂 Generating random salt (256-bit)...");
      const salt = generateSalt();
      addLog(`✓ Salt generated: ${salt.toString().slice(0, 20)}...`);

      addLog("⚡ Menghitung Poseidon Hash(password, salt)...");
      const hash = await poseidonHash(passwordField, salt);
      addLog(`✓ Poseidon Hash: ${hash.toString().slice(0, 20)}...`);
      addLog("🔒 Password TIDAK tersimpan — hanya hash yang dikirim ke blockchain!");

      // Step 2: Simpan ke blockchain
      setStep("blockchain");
      addLog("🌐 Memeriksa ketersediaan username di blockchain...");
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError("Username sudah digunakan!");
        setStep("form");
        return;
      }
      addLog("✓ Username tersedia!");

      addLog("📝 Mengirim transaksi register ke Sepolia Testnet...");
      addLog("⏳ Mohon konfirmasi di MetaMask...");
      const tx = await registerOnChain(username, hash, salt);
      setTxHash(tx);
      addLog(`✓ Transaksi berhasil! TX: ${tx.slice(0, 20)}...`);

      // Done!
      setStep("done");
      addLog("🎉 Registrasi berhasil! Salt disimpan di localStorage untuk login.");

      // Simpan salt di localStorage (untuk digunakan saat login)
      localStorage.setItem(`zkp_salt_${username.toLowerCase()}`, salt.toString());

    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
      setStep("form");
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gray-900/50 border border-green-800/50 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-400 mb-2">Registrasi Berhasil!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Akun kamu telah terdaftar di blockchain. Password tidak pernah meninggalkan browser kamu.
          </p>
          
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-800 rounded-lg px-4 py-3 text-xs font-mono text-indigo-400 hover:text-indigo-300 mb-6 break-all"
            >
              🔗 {txHash}
            </a>
          )}

          <div className="bg-gray-900 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs text-gray-500 font-mono space-y-1 max-h-40 overflow-y-auto">
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-all"
          >
            Login Sekarang →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Kembali
      </button>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-bold mb-1">Daftar Akun</h2>
        <p className="text-gray-500 text-sm mb-6">
          Password di-hash dengan Poseidon sebelum disimpan ke blockchain
        </p>

        {/* Progress steps */}
        {step !== "form" && (
          <div className="bg-gray-950 rounded-xl p-4 mb-6">
            <div className="text-xs text-gray-400 mb-2 font-mono">
              {step === "hashing" ? "⚡ Memproses ZK Hash..." : "🌐 Mengirim ke Blockchain..."}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs font-mono text-gray-500">{log}</div>
              ))}
              {step === "hashing" || step === "blockchain" && (
                <div className="text-xs font-mono text-indigo-400 animate-pulse">▋</div>
              )}
            </div>
          </div>
        )}

        {step === "form" && (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="contoh: alice123"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Konfirmasi Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
                ⚠️ {error}
              </div>
            )}

            <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg px-4 py-3 text-xs text-indigo-300 mb-6">
              🔒 <strong>ZKP Guarantee:</strong> Password kamu akan di-hash dengan Poseidon Hash di browser. Hanya hash yang tersimpan di blockchain. Server tidak pernah melihat password asli.
            </div>

            <button
              onClick={handleRegister}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-all"
            >
              Daftar dengan ZK Proof
            </button>

            <p className="text-center text-xs text-gray-600 mt-4">
              Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
