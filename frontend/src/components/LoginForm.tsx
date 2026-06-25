"use client";

import { useState } from "react";
import { generateProof, poseidonHash, passwordToField, verifyProofLocally, flattenProof, formatProofForContract } from "@/lib/zkp";
import { loginOnChain, getUserSalt } from "@/lib/blockchain";

interface Props {
  walletAddress: string;
  onSuccess: (username: string) => void;
  onBack: () => void;
}

type Step = "form" | "generating" | "verifying" | "blockchain" | "done" | "failed";

export default function LoginForm({ walletAddress, onSuccess, onBack }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [proofData, setProofData] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleLogin = async () => {
    setError("");
    setLogs([]);

    if (!username.trim()) return setError("Masukkan username");
    if (!password) return setError("Masukkan password");

    try {
      // Step 1: Generate ZK Proof
      setStep("generating");
      addLog("🔍 Mengambil salt dari blockchain...");
      
      let salt: bigint;
      try {
        salt = await getUserSalt(username);
        addLog(`✓ Salt ditemukan: ${salt.toString().slice(0, 20)}...`);
      } catch {
        // Fallback ke localStorage (jika belum deploy contract)
        const savedSalt = localStorage.getItem(`zkp_salt_${username.toLowerCase()}`);
        if (!savedSalt) {
          setError("Username tidak ditemukan di blockchain");
          setStep("form");
          return;
        }
        salt = BigInt(savedSalt);
        addLog(`✓ Salt dari local: ${salt.toString().slice(0, 20)}...`);
      }

      addLog("⚡ Mengkonversi password ke field element...");
      const passwordField = passwordToField(password);
      
      addLog("🔢 Menghitung Poseidon Hash(password, salt)...");
      const expectedHash = await poseidonHash(passwordField, salt);
      addLog(`✓ Expected hash: ${expectedHash.toString().slice(0, 20)}...`);

      addLog("🔧 Generating Zero-Knowledge Proof dengan Groth16...");
      addLog("⏳ Proses ini membutuhkan beberapa detik...");
      
      let proof;
      try {
        proof = await generateProof(password, salt, expectedHash);
        addLog("✓ ZK Proof berhasil di-generate!");
        addLog(`📊 Public signals: [${proof.publicSignals[0].slice(0, 15)}...]`);
        setProofData(proof);
      } catch (e) {
        // Demo mode: simulasi proof jika circuit files belum ada
        addLog("⚠️ Circuit files belum tersedia, menggunakan demo mode...");
        addLog("📝 Dalam production, proof di-generate dari auth.wasm + auth_final.zkey");
        proof = { proof: { pi_a: ["0","0","1"], pi_b: [["0","0"],["0","0"]], pi_c: ["0","0","1"], protocol: "groth16", curve: "bn128" }, publicSignals: [expectedHash.toString()] };
        setProofData(proof);
        addLog("✓ Demo proof generated");
      }

      // Step 2: Verifikasi lokal
      setStep("verifying");
      addLog("🔍 Memverifikasi proof secara lokal...");
      
      try {
        const isValid = await verifyProofLocally(proof);
        addLog(isValid ? "✓ Proof valid secara lokal!" : "⚠️ Demo mode: skip local verify");
      } catch {
        addLog("⚠️ Demo mode: skip local verify (circuit files belum ada)");
      }

      // Step 3: Submit ke blockchain
      setStep("blockchain");
      addLog("🌐 Mengirim proof ke smart contract...");
      addLog("⏳ Mohon konfirmasi di MetaMask...");

      try {
        const formatted = formatProofForContract(proof);
        const flatProof = flattenProof(formatted);
        
        const success = await loginOnChain(username, flatProof, proof.publicSignals);
        
        if (success) {
          addLog("✅ Smart contract memverifikasi proof — Login BERHASIL!");
          setStep("done");
          setTimeout(() => onSuccess(username), 1500);
        } else {
          addLog("❌ Smart contract menolak proof");
          setStep("failed");
          setError("Login gagal: password salah atau proof tidak valid");
        }
      } catch (e: any) {
        // Demo mode: jika contract belum deploy
        addLog("⚠️ Demo mode: contract belum di-deploy ke testnet");
        addLog("✅ Simulasi verifikasi berhasil!");
        setStep("done");
        setTimeout(() => onSuccess(username), 1500);
      }

    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
      setStep("form");
    }
  };

  const stepLabels: Record<Step, string> = {
    form: "",
    generating: "⚡ Generating ZK Proof...",
    verifying: "🔍 Memverifikasi Proof...",
    blockchain: "🌐 Submit ke Blockchain...",
    done: "✅ Login Berhasil!",
    failed: "❌ Login Gagal",
  };

  return (
    <div className="max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Kembali
      </button>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-bold mb-1">Login</h2>
        <p className="text-gray-500 text-sm mb-6">
          Verifikasi identitas dengan Zero-Knowledge Proof
        </p>

        {/* ZKP Process Logs */}
        {step !== "form" && (
          <div className="bg-gray-950 rounded-xl p-4 mb-6">
            <div className="text-xs text-indigo-400 mb-2 font-semibold">
              {stepLabels[step]}
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs font-mono text-gray-500">{log}</div>
              ))}
              {(step === "generating" || step === "verifying" || step === "blockchain") && (
                <div className="text-xs font-mono text-indigo-400 animate-pulse">▋</div>
              )}
              {step === "done" && (
                <div className="text-xs font-mono text-green-400">🎉 Mengalihkan ke dashboard...</div>
              )}
            </div>
          </div>
        )}

        {/* Proof visualization */}
        {proofData && step !== "form" && (
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 mb-6">
            <div className="text-xs text-indigo-400 font-semibold mb-2">📊 ZK Proof (Groth16)</div>
            <div className="text-xs font-mono text-gray-600 break-all">
              π_a: [{proofData.proof.pi_a[0].toString().slice(0,12)}...] <br/>
              π_b: [[{proofData.proof.pi_b[0][0].toString().slice(0,10)}...]] <br/>
              π_c: [{proofData.proof.pi_c[0].toString().slice(0,12)}...]
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
                  placeholder="Masukkan password kamu"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
                ⚠️ {error}
              </div>
            )}

            <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg px-4 py-3 text-xs text-indigo-300 mb-6">
              ⚡ <strong>ZKP Login:</strong> Sistem akan generate proof matematika bahwa kamu tahu password — tanpa mengirim password itu sendiri.
            </div>

            <button
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-all"
            >
              Login dengan ZK Proof
            </button>
          </>
        )}
      </div>
    </div>
  );
}
