/**
 * blockchain.ts - Interaksi dengan Smart Contract di Ethereum
 */

import { ethers } from "ethers";
import { poseidonHash, passwordToField } from "./zkp";

// ABI Smart Contract ZKPAuthSystem
export const CONTRACT_ABI = [
  "function register(uint256 usernameHash, uint256 passwordHash, uint256 salt) external",
  "function login(uint256 usernameHash, uint256[8] calldata proof, uint256[1] calldata publicSignals) external returns (bool)",
  "function getUserInfo(uint256 usernameHash) external view returns (bool isRegistered, uint256 salt, uint256 registeredAt, uint256 loginCount, uint256 lastLoginAt)",
  "function isUsernameAvailable(uint256 usernameHash) external view returns (bool)",
  "function getUserSalt(uint256 usernameHash) external view returns (uint256)",
  "function totalUsers() external view returns (uint256)",
  "event UserRegistered(uint256 indexed usernameHash, uint256 salt, uint256 timestamp)",
  "event UserLoggedIn(uint256 indexed usernameHash, uint256 timestamp)",
];

// Ganti dengan address contract yang sudah di-deploy
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Sepolia Testnet
export const CHAIN_ID = 11155111;
export const NETWORK_NAME = "Sepolia Testnet";

/**
 * Koneksi ke MetaMask
 */
export async function connectWallet(): Promise<string> {
  if (!(window as any).ethereum) {
    throw new Error("MetaMask tidak ditemukan! Install MetaMask terlebih dahulu.");
  }

  // Request akses ke wallet
  const accounts = await (window as any).ethereum.request({
    method: "eth_requestAccounts",
  });

  // Pastikan di network yang benar
  await switchToSepolia();

  return accounts[0];
}

/**
 * Switch ke Sepolia Testnet
 */
export async function switchToSepolia() {
  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (error: any) {
    // Kalau network belum ada, tambahkan
    if (error.code === 4902) {
      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${CHAIN_ID.toString(16)}`,
          chainName: "Sepolia Testnet",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    }
  }
}

/**
 * Get contract instance
 */
export async function getContract() {
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Hash username untuk disimpan di blockchain
 */
export function hashUsername(username: string): bigint {
  const bytes = new TextEncoder().encode(username.toLowerCase());
  let hash = 0n;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * 31n + BigInt(bytes[i])) % (2n ** 254n);
  }
  return hash;
}

/**
 * Register user ke blockchain
 */
export async function registerOnChain(
  username: string,
  passwordHash: bigint,
  salt: bigint
): Promise<string> {
  const contract = await getContract();
  const usernameHash = hashUsername(username);

  const tx = await contract.register(
    usernameHash.toString(),
    passwordHash.toString(),
    salt.toString()
  );

  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Login ke blockchain dengan ZK Proof
 */
export async function loginOnChain(
  username: string,
  proofArray: string[],
  publicSignals: string[]
): Promise<boolean> {
  const contract = await getContract();
  const usernameHash = hashUsername(username);

  const tx = await contract.login(
    usernameHash.toString(),
    proofArray,
    [publicSignals[0]]
  );

  const receipt = await tx.wait();
  
  // Cek event UserLoggedIn
  const iface = new ethers.Interface(CONTRACT_ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "UserLoggedIn") return true;
      if (parsed?.name === "LoginFailed") return false;
    } catch {}
  }
  
  return false;
}

/**
 * Cek apakah username tersedia
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const usernameHash = hashUsername(username);
  return await contract.isUsernameAvailable(usernameHash.toString());
}

/**
 * Ambil salt user dari blockchain (untuk login)
 */
export async function getUserSalt(username: string): Promise<bigint> {
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const usernameHash = hashUsername(username);
  const salt = await contract.getUserSalt(usernameHash.toString());
  return BigInt(salt.toString());
}
