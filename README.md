# 🔐 ZKP Auth System
### Sistem Register & Login berbasis Blockchain dengan Zero-Knowledge Proof

> **Tugas 9 - Implementasi Blockchain dengan Konsensus ZKP**

---

## 📋 Deskripsi

Sistem autentikasi yang memverifikasi identitas pengguna menggunakan **Zero-Knowledge Proof (ZKP)** tanpa server atau blockchain pernah mengetahui password asli pengguna.

### Konsep Utama ZKP yang Diimplementasikan

**Zero-Knowledge Proof** memiliki 3 properti matematis:
1. **Completeness** — Jika statement benar, verifier akan menerima proof
2. **Soundness** — Jika statement salah, tidak ada prover yang bisa meyakinkan verifier  
3. **Zero-Knowledge** — Verifier tidak mendapatkan informasi apapun selain kebenaran statement

Dalam konteks login:
- **Statement**: "Saya tahu password yang menghasilkan hash H"
- **Yang dibuktikan**: Pengetahuan akan password
- **Yang TIDAK bocor**: Password itu sendiri

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│                                                         │
│  Password → [Poseidon Hash] → passwordHash              │
│  Password + Salt → [Circom Circuit] → ZK Proof          │
│                                                         │
│  ⚠️  Password TIDAK pernah meninggalkan browser!        │
└────────────────────────┬────────────────────────────────┘
                         │ ZK Proof + Public Signals
                         ▼
┌─────────────────────────────────────────────────────────┐
│              BLOCKCHAIN (Sepolia Testnet)                │
│                                                         │
│  ZKPAuthSystem.sol                                      │
│    ├─ register(usernameHash, passwordHash, salt)        │
│    └─ login(usernameHash, proof, publicSignals)         │
│         └─ Verifier.sol → verifyProof()                 │
│              └─ Groth16 verification algorithm          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Komponen Teknis

### 1. ZK Circuit (`circuits/auth.circom`)
```circom
template AuthCircuit() {
    signal input password;      // PRIVATE - tidak bocor ke verifier
    signal input salt;          // PRIVATE - tidak bocor ke verifier
    signal input expectedHash;  // PUBLIC  - tersimpan di blockchain
    signal output valid;

    // Poseidon Hash adalah hash function ZK-friendly
    // Jauh lebih efisien dibanding SHA256 dalam ZK circuit
    component hasher = Poseidon(2);
    hasher.inputs[0] <== password;
    hasher.inputs[1] <== salt;
    
    // Constraint matematis: Hash(password, salt) === expectedHash
    hasher.out === expectedHash;
}
```

### 2. Logika Matematis ZKP

**Poseidon Hash Function:**
- Dirancang khusus untuk ZK-friendly computation
- Beroperasi di atas finite field Fp (prime field)
- Jauh lebih efisien dibanding SHA256 dalam circuit (SHA256 butuh ~25,000 constraints, Poseidon hanya ~240)

**Groth16 Proof System (zk-SNARKs):**
- Proof size: **konstan** (~200 bytes) terlepas dari kompleksitas komputasi
- Verifikasi time: **O(1)** - sangat efisien untuk on-chain verification
- Keamanan: berdasarkan discrete logarithm problem di elliptic curve BN128

**Struktur Proof Groth16:**
```
Proof = (π_A, π_B, π_C) dimana:
  π_A ∈ G1 (elliptic curve point)
  π_B ∈ G2 (elliptic curve point)  
  π_C ∈ G1 (elliptic curve point)

Verifikasi: e(π_A, π_B) = e(α, β) · e(Σ aᵢγᵢ, γ) · e(π_C, δ)
dimana e adalah pairing function di BN128
```

### 3. Smart Contract (`contracts/ZKPAuthSystem.sol`)
- Menyimpan `Hash(password, salt)` — bukan password
- Fungsi `register()`: simpan hash ke blockchain
- Fungsi `login()`: verifikasi ZK Proof on-chain
- Menggunakan `Verifier.sol` (di-generate otomatis oleh SnarkJS)

### 4. Frontend (`frontend/`)
- Next.js 14 + TypeScript
- SnarkJS untuk generate proof di browser
- Ethers.js untuk interaksi blockchain
- MetaMask untuk wallet connection

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| ZK Circuit | Circom 2.0 |
| ZK Proof System | SnarkJS (Groth16) |
| Hash Function | Poseidon (via circomlib) |
| Smart Contract | Solidity 0.8.19 |
| Blockchain | Ethereum Sepolia Testnet |
| Frontend | Next.js 14 + TypeScript |
| Blockchain SDK | Ethers.js v6 |
| Wallet | MetaMask |
| Hosting | Vercel |
| Contract Deploy | Hardhat |

---

## 🚀 Cara Menjalankan

### Prerequisites
```bash
# Install Node.js (v18+)
node --version

# Install Circom
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
cargo install circom

# Install SnarkJS
npm install -g snarkjs

# Install MetaMask di browser
# https://metamask.io/download/
```

### Step 1: Clone & Install
```bash
git clone <repo-url>
cd zkp-auth
```

### Step 2: Compile Circuit & Generate Keys
```bash
chmod +x scripts/setup_circuit.sh
./scripts/setup_circuit.sh
```
Script ini akan:
- Compile `auth.circom` → `auth.wasm` + `auth.r1cs`
- Jalankan Powers of Tau ceremony
- Generate proving key (`auth_final.zkey`)
- Generate verification key (`verification_key.json`)
- **Generate `Verifier.sol`** (smart contract verifier otomatis!)
- Copy semua file ke `frontend/public/circuits/`

### Step 3: Deploy Smart Contract ke Sepolia
```bash
cd contracts
npm install

# Setup environment
cp ../.env.example .env
# Edit .env: isi PRIVATE_KEY dan SEPOLIA_RPC_URL

# Deploy
npx hardhat run ../scripts/deploy.js --network sepolia
```
Catat address contract yang muncul!

### Step 4: Setup Frontend
```bash
cd frontend
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local: isi NEXT_PUBLIC_CONTRACT_ADDRESS dari step 3

npm run dev
# Buka http://localhost:3000
```

### Step 5: Deploy ke Vercel
```bash
# Install Vercel CLI
npm install -g vercel

cd frontend
vercel

# Set environment variable di Vercel Dashboard:
# NEXT_PUBLIC_CONTRACT_ADDRESS = <address dari step 3>
```

---

## 📂 Struktur Proyek

```
zkp-auth/
├── circuits/
│   └── auth.circom          # ZK Circuit (WAJIB DIDOKUMENTASIKAN)
├── contracts/
│   ├── ZKPAuthSystem.sol    # Main smart contract
│   ├── Verifier.sol         # Auto-generated dari SnarkJS
│   ├── hardhat.config.js
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── circuits/        # Circuit files (wasm, zkey, vkey)
│   └── src/
│       ├── app/
│       │   ├── page.tsx     # Halaman utama
│       │   └── layout.tsx
│       ├── components/
│       │   ├── RegisterForm.tsx
│       │   ├── LoginForm.tsx
│       │   ├── Dashboard.tsx
│       │   └── WalletConnect.tsx
│       └── lib/
│           ├── zkp.ts       # ZKP logic (hash, prove, verify)
│           └── blockchain.ts # Contract interaction
└── scripts/
    ├── setup_circuit.sh     # Setup ZK circuit
    └── deploy.js            # Deploy contracts
```

---

## 🔒 Keamanan

- **Password tidak pernah meninggalkan browser** — hanya proof yang dikirim
- **Salt unik per user** — mencegah rainbow table dan precomputation attack
- **Poseidon Hash** — hash function yang aman dan efisien untuk ZK
- **Groth16 zk-SNARK** — proof sistem dengan keamanan terbukti secara kriptografis
- **Trusted Setup** — Powers of Tau ceremony memastikan tidak ada backdoor

---

## 🌐 Live Demo

Deployed ke Vercel: `https://zkp-auth-[username].vercel.app`

Contract di Sepolia: `https://sepolia.etherscan.io/address/[CONTRACT_ADDRESS]`

---

## 📚 Referensi

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS GitHub](https://github.com/iden3/snarkjs)
- [Poseidon Hash Paper](https://eprint.iacr.org/2019/458.pdf)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [ZKP Introduction](https://zkp.science/)
