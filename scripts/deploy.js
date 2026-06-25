// scripts/deploy.js
// Jalankan: npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts dengan akun:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ---- Deploy Verifier (di-generate dari SnarkJS) ----
  console.log("\n📝 Deploy Verifier contract...");
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("✓ Verifier deployed ke:", await verifier.getAddress());

  // ---- Deploy ZKPAuthSystem ----
  console.log("\n🔐 Deploy ZKPAuthSystem contract...");
  const ZKPAuthSystem = await ethers.getContractFactory("ZKPAuthSystem");
  const zkpAuth = await ZKPAuthSystem.deploy(await verifier.getAddress());
  await zkpAuth.waitForDeployment();
  const authAddress = await zkpAuth.getAddress();
  console.log("✓ ZKPAuthSystem deployed ke:", authAddress);

  // ---- Output untuk .env ----
  console.log("\n🎉 Deployment selesai!");
  console.log("================================");
  console.log("Tambahkan ke frontend/.env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${authAddress}`);
  console.log("\nVerifikasi di Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${authAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
