pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * AuthCircuit - Zero-Knowledge Proof untuk autentikasi password
 * 
 * Cara kerja:
 * - Prover (client) punya password asli (private input)
 * - Circuit menghash password dengan Poseidon hash
 * - Output adalah hash yang dibandingkan dengan hash tersimpan di blockchain
 * - Verifier (blockchain) hanya melihat hash, TIDAK PERNAH melihat password asli
 */
template AuthCircuit() {
    // Private input: password yang hanya diketahui user (tidak bocor ke verifier)
    signal input password;
    
    // Private input: salt unik per user (mencegah rainbow table attack)  
    signal input salt;
    
    // Public input: hash yang tersimpan di blockchain (diketahui semua orang)
    signal input expectedHash;
    
    // Output: apakah proof valid (1 = valid, 0 = invalid)
    signal output valid;

    // Komponen Poseidon Hash (lebih efisien untuk ZK dibanding SHA256)
    component hasher = Poseidon(2);
    
    // Hash(password, salt) → ini yang dibuktikan tanpa membocorkan password
    hasher.inputs[0] <== password;
    hasher.inputs[1] <== salt;
    
    // Bandingkan hasil hash dengan expectedHash
    component isEqual = IsEqual();
    isEqual.in[0] <== hasher.out;
    isEqual.in[1] <== expectedHash;
    
    // Output valid jika hash cocok
    valid <== isEqual.out;
    
    // Constraint: proof hanya valid jika hash benar-benar cocok
    valid === 1;
}

component main {public [expectedHash]} = AuthCircuit();
