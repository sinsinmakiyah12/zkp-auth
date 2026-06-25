// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ZKPAuthSystem
 * @dev Sistem autentikasi berbasis Zero-Knowledge Proof
 * 
 * Cara kerja:
 * 1. User register: menyimpan hash(password, salt) di blockchain — password TIDAK pernah tersimpan
 * 2. User login: mengirim ZK proof bahwa mereka tahu password yang menghasilkan hash tersebut
 * 3. Smart contract memverifikasi proof TANPA perlu tahu password asli
 */
contract ZKPAuthSystem {
    
    // ===================== STRUCTS =====================
    
    struct UserData {
        uint256 passwordHash;   // Hash Poseidon dari (password, salt)
        uint256 salt;           // Salt publik unik per user
        bool isRegistered;      // Status registrasi
        uint256 registeredAt;   // Timestamp registrasi
        uint256 loginCount;     // Jumlah login berhasil
        uint256 lastLoginAt;    // Timestamp login terakhir
    }
    
    // ===================== STATE VARIABLES =====================
    
    // Mapping dari username hash ke data user
    mapping(uint256 => UserData) private users;
    
    // Mapping untuk cek apakah username sudah dipakai
    mapping(uint256 => bool) private usernameExists;
    
    // Verifier contract (di-deploy terpisah dari circom)
    IVerifier public verifier;
    
    // Total user terdaftar
    uint256 public totalUsers;
    
    // ===================== EVENTS =====================
    
    event UserRegistered(uint256 indexed usernameHash, uint256 salt, uint256 timestamp);
    event UserLoggedIn(uint256 indexed usernameHash, uint256 timestamp);
    event LoginFailed(uint256 indexed usernameHash, uint256 timestamp);
    
    // ===================== CONSTRUCTOR =====================
    
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }
    
    // ===================== FUNCTIONS =====================
    
    /**
     * @dev Register user baru
     * @param usernameHash Hash dari username (Poseidon hash)
     * @param passwordHash Hash dari (password, salt) — password TIDAK dikirim
     * @param salt Salt unik yang digunakan untuk hashing
     */
    function register(
        uint256 usernameHash,
        uint256 passwordHash,
        uint256 salt
    ) external {
        require(!usernameExists[usernameHash], "Username sudah terdaftar");
        require(passwordHash != 0, "Password hash tidak boleh kosong");
        require(salt != 0, "Salt tidak boleh kosong");
        
        users[usernameHash] = UserData({
            passwordHash: passwordHash,
            salt: salt,
            isRegistered: true,
            registeredAt: block.timestamp,
            loginCount: 0,
            lastLoginAt: 0
        });
        
        usernameExists[usernameHash] = true;
        totalUsers++;
        
        emit UserRegistered(usernameHash, salt, block.timestamp);
    }
    
    /**
     * @dev Login dengan verifikasi ZK Proof
     * @param usernameHash Hash dari username
     * @param proof ZK Proof yang dihasilkan oleh client (circom/snarkjs)
     * @param publicSignals Signal publik dari proof [expectedHash]
     */
    function login(
        uint256 usernameHash,
        uint256[8] calldata proof,
        uint256[1] calldata publicSignals
    ) external returns (bool) {
        require(usernameExists[usernameHash], "Username tidak ditemukan");
        
        UserData storage user = users[usernameHash];
        
        // Pastikan expectedHash dari proof sama dengan yang tersimpan
        require(publicSignals[0] == user.passwordHash, "Hash tidak cocok");
        
        // Verifikasi ZK Proof menggunakan verifier contract
        bool isValid = verifier.verifyProof(
            [proof[0], proof[1]],           // proof.a
            [[proof[2], proof[3]], [proof[4], proof[5]]],  // proof.b
            [proof[6], proof[7]],           // proof.c
            publicSignals
        );
        
        if (isValid) {
            user.loginCount++;
            user.lastLoginAt = block.timestamp;
            emit UserLoggedIn(usernameHash, block.timestamp);
            return true;
        } else {
            emit LoginFailed(usernameHash, block.timestamp);
            return false;
        }
    }
    
    /**
     * @dev Ambil data publik user (bukan password!)
     */
    function getUserInfo(uint256 usernameHash) external view returns (
        bool isRegistered,
        uint256 salt,
        uint256 registeredAt,
        uint256 loginCount,
        uint256 lastLoginAt
    ) {
        UserData storage user = users[usernameHash];
        return (
            user.isRegistered,
            user.salt,
            user.registeredAt,
            user.loginCount,
            user.lastLoginAt
        );
    }
    
    /**
     * @dev Cek apakah username sudah terdaftar
     */
    function isUsernameAvailable(uint256 usernameHash) external view returns (bool) {
        return !usernameExists[usernameHash];
    }
    
    /**
     * @dev Ambil salt user (dibutuhkan untuk generate proof saat login)
     */
    function getUserSalt(uint256 usernameHash) external view returns (uint256) {
        require(usernameExists[usernameHash], "Username tidak ditemukan");
        return users[usernameHash].salt;
    }
}

/**
 * @title IVerifier
 * @dev Interface untuk Verifier contract yang di-generate otomatis oleh SnarkJS
 */
interface IVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[1] calldata input
    ) external view returns (bool);
}
