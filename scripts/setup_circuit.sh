#!/bin/bash
# ============================================================
# setup_circuit.sh - Compile ZK Circuit & Generate Keys
# ============================================================
# Jalankan script ini SEKALI sebelum deploy aplikasi
# Membutuhkan: circom, snarkjs (npm install -g circom snarkjs)
# ============================================================

set -e

CIRCUIT_DIR="./circuits"
OUTPUT_DIR="./frontend/public/circuits"
BUILD_DIR="./build"

echo "🚀 ZKP Auth System - Circuit Setup"
echo "===================================="

# Buat direktori
mkdir -p $BUILD_DIR $OUTPUT_DIR

# ---- STEP 1: Install dependencies ----
echo ""
echo "📦 Step 1: Install circomlib..."
cd $CIRCUIT_DIR
npm init -y > /dev/null 2>&1
npm install circomlib > /dev/null 2>&1
cd ..
echo "✓ circomlib installed"

# ---- STEP 2: Compile Circuit ----
echo ""
echo "⚡ Step 2: Compile auth.circom..."
circom circuits/auth.circom \
  --r1cs \
  --wasm \
  --sym \
  -o $BUILD_DIR
echo "✓ Circuit compiled → R1CS + WASM"

# ---- STEP 3: Powers of Tau (Trusted Setup) ----
echo ""
echo "🔑 Step 3: Powers of Tau ceremony (phase 1)..."
snarkjs powersoftau new bn128 12 $BUILD_DIR/pot12_0000.ptau -v
snarkjs powersoftau contribute $BUILD_DIR/pot12_0000.ptau $BUILD_DIR/pot12_0001.ptau \
  --name="Initial contribution" -v -e="zkp auth random entropy"
snarkjs powersoftau prepare phase2 $BUILD_DIR/pot12_0001.ptau $BUILD_DIR/pot12_final.ptau -v
echo "✓ Powers of Tau complete"

# ---- STEP 4: Groth16 Setup ----
echo ""
echo "🔧 Step 4: Groth16 setup (phase 2)..."
snarkjs groth16 setup $BUILD_DIR/auth.r1cs $BUILD_DIR/pot12_final.ptau $BUILD_DIR/auth_0000.zkey
snarkjs zkey contribute $BUILD_DIR/auth_0000.zkey $BUILD_DIR/auth_0001.zkey \
  --name="Auth contribution" -v -e="additional entropy for zkp auth"
snarkjs zkey beacon $BUILD_DIR/auth_0001.zkey $BUILD_DIR/auth_final.zkey \
  0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
echo "✓ Proving key (zkey) generated"

# ---- STEP 5: Export Verification Key ----
echo ""
echo "📋 Step 5: Export verification key..."
snarkjs zkey export verificationkey $BUILD_DIR/auth_final.zkey $OUTPUT_DIR/verification_key.json
echo "✓ Verification key exported"

# ---- STEP 6: Generate Solidity Verifier ----
echo ""
echo "📝 Step 6: Generate Solidity verifier contract..."
snarkjs zkey export solidityverifier $BUILD_DIR/auth_final.zkey ./contracts/Verifier.sol
echo "✓ Verifier.sol generated → contracts/Verifier.sol"

# ---- STEP 7: Copy circuit files to frontend ----
echo ""
echo "📂 Step 7: Copy files ke frontend public..."
cp $BUILD_DIR/auth_js/auth.wasm $OUTPUT_DIR/auth.wasm
cp $BUILD_DIR/auth_final.zkey $OUTPUT_DIR/auth_final.zkey
echo "✓ Circuit files copied ke frontend/public/circuits/"

# ---- DONE ----
echo ""
echo "🎉 Setup Complete!"
echo "================================="
echo "Files yang dihasilkan:"
echo "  ✓ $OUTPUT_DIR/auth.wasm         (Circuit compiled)"
echo "  ✓ $OUTPUT_DIR/auth_final.zkey   (Proving key)"
echo "  ✓ $OUTPUT_DIR/verification_key.json (Verification key)"
echo "  ✓ contracts/Verifier.sol        (Solidity verifier)"
echo ""
echo "Langkah selanjutnya:"
echo "  1. Deploy contracts/Verifier.sol ke Sepolia"
echo "  2. Deploy contracts/ZKPAuthSystem.sol dengan address Verifier"
echo "  3. Update NEXT_PUBLIC_CONTRACT_ADDRESS di .env.local"
echo "  4. cd frontend && npm run dev"
