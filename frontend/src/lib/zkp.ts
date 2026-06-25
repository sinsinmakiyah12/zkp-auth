/**
 * zkp.ts - Core Zero-Knowledge Proof Logic
 * 
 * Library ini mengimplementasikan ZKP untuk autentikasi:
 * - Poseidon Hash (ZK-friendly hash function)
 * - Proof Generation menggunakan SnarkJS
 * - Proof Verification
 */

import { buildPoseidon } from "circomlibjs";

// Type untuk ZK Proof
export interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

export interface ProofForContract {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: string[];
}

// Singleton poseidon instance
let poseidonInstance: any = null;

/**
 * Inisialisasi Poseidon Hash
 * Poseidon adalah hash function yang dirancang khusus untuk ZK circuits
 * Jauh lebih efisien dibanding SHA256 dalam ZK proof
 */
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Hash password menggunakan Poseidon Hash
 * H(password, salt) → hash
 * 
 * @param password - Password asli user (BigInt representation)
 * @param salt - Salt unik per user
 * @returns Hash sebagai BigInt
 */
export async function poseidonHash(password: bigint, salt: bigint): Promise<bigint> {
  const poseidon = await getPoseidon();
  const hash = poseidon([password, salt]);
  return poseidon.F.toObject(hash);
}

/**
 * Konversi string password ke BigInt untuk digunakan dalam circuit
 * Menggunakan encoding UTF-8 → bytes → BigInt
 */
export function passwordToField(password: string): bigint {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(password);
  let result = 0n;
  for (let i = 0; i < Math.min(bytes.length, 31); i++) {
    result = result * 256n + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Generate salt acak yang kuat secara kriptografis
 */
export function generateSalt(): bigint {
  const array = new Uint8Array(31);
  crypto.getRandomValues(array);
  let salt = 0n;
  for (const byte of array) {
    salt = salt * 256n + BigInt(byte);
  }
  return salt;
}

/**
 * Generate Zero-Knowledge Proof
 * 
 * Proses:
 * 1. Konversi password ke field element
 * 2. Hash(password, salt) dengan Poseidon
 * 3. Generate proof menggunakan SnarkJS
 * 
 * KUNCI: password tidak pernah meninggalkan browser!
 * Hanya proof yang dikirim ke blockchain.
 */
export async function generateProof(
  password: string,
  salt: bigint,
  expectedHash: bigint
): Promise<ZKProof> {
  const snarkjs = await import("snarkjs");
  
  const passwordField = passwordToField(password);
  
  // Input untuk circuit (password & salt adalah PRIVATE, expectedHash adalah PUBLIC)
  const input = {
    password: passwordField.toString(),
    salt: salt.toString(),
    expectedHash: expectedHash.toString(),
  };

  // Generate proof menggunakan WASM circuit dan proving key
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "/circuits/auth.wasm",       // Circuit compiled
    "/circuits/auth_final.zkey"  // Proving key
  );

  return { proof, publicSignals };
}

/**
 * Verifikasi proof secara lokal (client-side)
 * Untuk validasi sebelum mengirim ke blockchain
 */
export async function verifyProofLocally(zkProof: ZKProof): Promise<boolean> {
  const snarkjs = await import("snarkjs");
  
  // Load verification key
  const response = await fetch("/circuits/verification_key.json");
  const vKey = await response.json();
  
  return await snarkjs.groth16.verify(vKey, zkProof.publicSignals, zkProof.proof);
}

/**
 * Format proof untuk dikirim ke smart contract Solidity
 * SnarkJS menghasilkan format berbeda dengan yang dibutuhkan Solidity
 */
export function formatProofForContract(zkProof: ZKProof): ProofForContract {
  const { proof, publicSignals } = zkProof;
  
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],  // Perhatikan: b dibalik untuk Solidity
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: publicSignals,
  };
}

/**
 * Flatten proof untuk array uint256[8] di Solidity
 */
export function flattenProof(formatted: ProofForContract): string[] {
  return [
    formatted.a[0],
    formatted.a[1],
    formatted.b[0][0],
    formatted.b[0][1],
    formatted.b[1][0],
    formatted.b[1][1],
    formatted.c[0],
    formatted.c[1],
  ];
}
