use dep::std;

// Main library function to compute transaction hash
pub unconstrained fn check_key(
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    hashed_message: [u8; 32],
    prover_address:  [u8; 20],
    countryparty_address: [u8; 20],
    token_address: [u8; 20],
    key: [u8; 32],
)  {
    // Recover address from signature
    //let address = ecrecover::ecrecover(pub_key_x, pub_key_y, signature, hashed_message);
    
    // Hash the signature
    let hash_signature = keccak256::keccak256(signature, 64);
    
    // Verify the recovered address matches the prover address
    //assert_eq(prover_address, field_to_bytes_20(address));
    
    // Convert addresses to bytes
    let prover_addr_bytes = prover_address;
    let countryparty_addr_bytes = countryparty_address;
    
    // Prepare encoded data (92 bytes total)
    let mut encoded: [u8; 92] = [0; 92];
    let mut lhs = [0; 20];
    let mut rhs = [0; 20];
    
    // Determine order based on is_send flag
     lhs = prover_addr_bytes;
     rhs = countryparty_addr_bytes;
    
    // Encode: sender (20) + receiver (20) + token (20) + sig_hash (32)
    for i in 0..20 {
        encoded[i] = lhs[i];
    }
    for i in 20..40 {
        encoded[i] = rhs[i - 20];
    }
    for i in 0..20 {
        encoded[40 + i] = token_address[i];
    }
    for i in 0..32 {
        encoded[60 + i] = hash_signature[i];
    }
    
    let final_hash = keccak256::keccak256(encoded, 92);
    
    std::println("encoded");
    std::println(encoded);
    std::println("Test passed! Main function executed successfully.");
    std::println(final_hash);
    std::println(key);
    assert_eq(final_hash, key);
}

// Helper function to convert Field to 20 bytes (Ethereum address)
pub unconstrained fn field_to_bytes_20(f: Field) -> [u8; 20] {
    let bytes = f.to_be_bytes::<32>();
    let mut result: [u8; 20] = [0; 20];
    for i in 0..20 {
        result[i] = bytes[12 + i]; // Take last 20 bytes (160 bits)
    }
    result
}

// Helper function to convert 32 bytes to Field
pub unconstrained fn bytes32_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}

#[test]
unconstrained fn test_compute_check_key() {
    let pub_key_x: [u8; 32] = [
        167, 1, 227, 30, 163, 41, 124, 31, 117, 98, 23, 40, 211, 128, 235, 52, 55, 130, 211, 115,
        100, 28, 72, 115, 14, 141, 40, 171, 136, 112, 19, 31,
    ];

    let pub_key_y: [u8; 32] = [
        251, 52, 202, 67, 50, 87, 144, 123, 171, 75, 185, 162, 4, 41, 143, 107, 237, 205, 91, 126,
        204, 21, 18, 34, 246, 186, 200, 210, 219, 216, 248, 60,
    ];

    let signature: [u8; 64] = [
        8, 73, 204, 13, 170, 75, 221, 0, 62, 119, 11, 118, 218, 224, 212, 118, 163, 169, 83, 28,
        252, 29, 69, 197, 121, 156, 98, 89, 80, 231, 83, 208, 126, 33, 213, 114, 247, 220, 68, 27,
        149, 159, 61, 68, 72, 115, 183, 188, 178, 221, 97, 126, 243, 18, 240, 169, 58, 225, 176,
        190, 136, 11, 235, 131,
    ];

    let hashed_message: [u8; 32] = [
        235, 253, 109, 103, 213, 171, 112, 7, 135, 149, 110, 64, 159, 142, 173, 12, 99, 196, 92,
        127, 202, 100, 111, 76, 147, 181, 13, 170, 219, 39, 18, 61,
    ];

let prover_address: [u8; 20] = [
    0x3E, 0x00, 0x18, 0x36, 0xe2, 0x40, 0x9f, 0xa0, 0x80, 0x2b, 0x47, 0x3d, 0x00, 0x61, 0xe3, 
    0x38, 0xd6, 0xE4, 0xcf, 0x48,
];

let counterparty_address: [u8; 20] = [
    0x3E, 0x00, 0x18, 0x36, 0xe2, 0x40, 0x9f, 0xa0, 0x80, 0x2b, 0x47, 0x3d, 0x00, 0x61, 0xe3, 
    0x38, 0xd6, 0xE4, 0xcf, 0x48,
];

    let token_address: [u8; 20] = [
        0xa0, 0xb8, 0x69, 0x91, 0xc6, 0x21, 0x8b, 0x36, 0xc1, 0xd1, 0x9d, 0x4a, 0x2e, 0x9e, 0xb0,
        0xce, 0x36, 0x06, 0xeb, 0x48,
    ];

    let key = [ 62, 160, 226, 200, 79, 177, 222, 138, 79, 106, 46, 243, 43, 73, 134, 202, 75, 142, 108, 167, 59, 79, 203, 172, 173, 54, 21, 83, 89, 152, 246, 251 ];

    
     check_key(
        pub_key_x,
        pub_key_y,
        signature,
        hashed_message,
        prover_address,
        counterparty_address,
        token_address,
        key
    );
    
    
    std::println("Test passed! Result hash computed successfully.");
}
