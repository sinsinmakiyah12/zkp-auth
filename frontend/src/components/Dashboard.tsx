"use client";

import { UserSession } from "@/app/page";

interface Props {
  session: UserSession;
  onLogout: () => void;
}

export default function Dashboard({ session, onLogout }: Props) {
  const loginTime = session.loginTime.toLocaleTimeString("id-ID");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Banner */}
      <div className="bg-green-950/30 border border-green-800/50 rounded-2xl p-6 mb-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-green-400 mb-1">Login Berhasil via ZKP!</h2>
        <p className="text-gray-400 text-sm">
          Identitasmu diverifikasi tanpa blockchain mengetahui passwordmu
        </p>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-1">Username</div>
          <div className="font-semibold">@{session.username}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-1">Waktu Login</div>
          <div className="font-semibold">{loginTime}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 col-span-2">
          <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
          <div className="font-mono text-sm text-indigo-300">{session.address}</div>
        </div>
      </div>

      {/* ZKP Explanation */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4 text-sm">🔐 Apa yang Terjadi Tadi?</h3>
        <div className="space-y-3">
          {[
            { icon: "1️⃣", text: "Passwordmu di-hash dengan Poseidon Hash (ZK-friendly) di browser" },
            { icon: "2️⃣", text: "Circom circuit men-generate Groth16 ZK Proof secara lokal" },
            { icon: "3️⃣", text: "Proof dikirim ke smart contract di Sepolia Testnet" },
            { icon: "4️⃣", text: "Smart contract memverifikasi proof TANPA melihat password asli" },
            { icon: "✅", text: "Login berhasil! Password kamu aman — tidak pernah meninggalkan browser" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span>{item.icon}</span>
              <span className="text-gray-400">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ZKP Properties */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Completeness", desc: "Proof yang valid selalu diterima", color: "green" },
          { label: "Soundness", desc: "Proof palsu tidak bisa lolos verifikasi", color: "blue" },
          { label: "Zero-Knowledge", desc: "Verifier tidak belajar apapun selain kebenaran", color: "indigo" },
        ].map((prop) => (
          <div key={prop.label} className={`bg-${prop.color}-950/20 border border-${prop.color}-900/30 rounded-xl p-4`}>
            <div className={`text-xs font-semibold text-${prop.color}-400 mb-1`}>{prop.label}</div>
            <div className="text-xs text-gray-500">{prop.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onLogout}
        className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all border border-gray-700"
      >
        Logout
      </button>
    </div>
  );
}
