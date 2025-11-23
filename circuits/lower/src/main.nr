mod U256;
use keccak256::keccak256;
use prove_transfer_key;
use U256::U256Bytes;

unconstrained fn main(
    value: [[u8; 32]; 50],
    size: u32,
    leaf_hash: pub [u8; 32],
    pairwise_value_bytes: pub [u8; 32],
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    hashed_message: [u8; 32],
    prover_address: pub [u8; 20],
    countryparty_address: pub [u8; 20],
    token_address: pub [u8; 20],
    key: pub [u8; 32],
) {
    prove_transfer_key::check_key(
        pub_key_x,
        pub_key_y,
        signature,
        hashed_message,
        prover_address,
        countryparty_address,
        token_address,
        key,
    );

    let pairwise_value = U256Bytes::new(pairwise_value_bytes);
    let mut concatenated: [u8; 1664] = [0; 1664]; // 50 * 32 = 1600 max
    let mut offset = 0;

    // Add the key (32 bytes)
    for i in 0..32 {
        concatenated[offset] = key[i];
        offset += 1;
    }

    // Add all values (size * 32 bytes)
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value[i][j];
            offset += 1;
        }
    }
    // Add pairwise_value at the current offset (where data actually ends)
    for i in 0..31 {
        concatenated[offset] = 0;
        offset += 1;
    }
    concatenated[offset] = 1;

    let calc_leaf_hash = keccak256(concatenated, size * 32 + 64);

    //assert(leaf_hash == calc_leaf_hash);

    for i in 0..50 {
        let value_bytes = U256Bytes::new(value[i]);
        assert(value_bytes <= pairwise_value);
    }
}

#[test]
unconstrained fn test_main() {
    let pub_key_x: [u8; 32] = [
        167, 1, 227, 30, 163, 41, 124, 31, 117, 98, 23, 40, 211, 128, 235, 52, 55, 130, 211, 115,
        100, 28, 72, 115, 14, 141, 40, 171, 136, 112, 19, 31,
    ];
    let pub_key_y: [u8; 32] = [
        251, 52, 202, 67, 50, 87, 144, 123, 171, 75, 185, 162, 4, 41, 143, 107, 237, 205, 91, 126,
        204, 21, 18, 34, 246, 186, 200, 210, 219, 216, 248, 60,
    ];

    let signature: [u8; 64] = [
        115, 155, 191, 76, 93, 103, 244, 224, 84, 203, 224, 196, 214, 244, 224, 144, 133, 152, 114,
        128, 24, 57, 60, 0, 241, 88, 184, 77, 33, 179, 168, 18, 51, 141, 73, 214, 178, 89, 21, 45,
        141, 57, 212, 159, 231, 240, 64, 56, 94, 16, 193, 69, 191, 117, 48, 40, 192, 254, 56, 74,
        50, 215, 247, 50,
    ];
    let hashed_message: [u8; 32] = [
        90, 251, 82, 21, 213, 152, 102, 181, 33, 69, 247, 117, 204, 190, 24, 141, 126, 186, 230,
        132, 148, 157, 220, 87, 254, 242, 206, 153, 206, 52, 177, 205,
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
        0x3E, 0x00, 0x18, 0x36, 0xe2, 0x40, 0x9f, 0xa0, 0x80, 0x2b, 0x47, 0x3d, 0x00, 0x61, 0xe3,
        0x38, 0xd6, 0xE4, 0xcf, 0x48,
    ];


    let key: [u8; 32] = [ 46, 133, 225, 23, 62, 168, 20, 185, 219, 173, 50, 162, 27, 6, 69, 43, 245, 69, 178, 171, 243, 237, 204, 66, 209, 40, 106, 23, 215, 160, 139, 151 ];

    let mut value_array: [[u8; 32]; 50] = [[0; 32]; 50];
    let size: u32 = 10;

    for i in 0..size {
        let num = ((i + 1) * 5) as u8;
        value_array[i][31] = num;
    }

    // Calculate leaf hash
    let mut concatenated: [u8; 384] = [0; 384];
    let mut offset = 0;

    // Add the key (32 bytes)
    for i in 0..32 {
        concatenated[offset] = key[i];
        offset += 1;
    }

    // Add all values (size * 32 bytes)
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value_array[i][j];
            offset += 1;
        }
    }
    // Add pairwise_value at the current offset (where data actually ends)
    for i in 0..31 {
        concatenated[offset] = 0;
        offset += 1;
    }
    concatenated[offset] = 1;

    let leaf_hash = keccak256(concatenated, size * 32 + 64);

    std::println(concatenated);

    std::println(leaf_hash);

    let mut pairwise = [0; 32];
    pairwise[31] = 255;

    main(
        value_array,
        size,
        leaf_hash,
        pairwise,
        pub_key_x,
        pub_key_y,
        signature,
        hashed_message,
        prover_address,
        counterparty_address,
        token_address,
        key,
    );

    std::println("Test passed! Main function executed successfully.");
}

#[test(should_fail)]
unconstrained fn test_main_fail() {
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
        0x3E, 0x00, 0x18, 0x36, 0xe2, 0x40, 0x9f, 0xa0, 0x80, 0x2b, 0x47, 0x3d, 0x00, 0x61, 0xe3,
        0x38, 0xd6, 0xE4, 0xcf, 0x48,
    ];

    let key: [u8; 32] = [ 46, 133, 225, 23, 62, 168, 20, 185, 219, 173, 50, 162, 27, 6, 69, 43, 245, 69, 178, 171, 243, 237, 204, 66, 209, 40, 106, 23, 215, 160, 139, 151 ];

    // Setup value array with larger values
    let mut value_array: [[u8; 32]; 50] = [[0; 32]; 50];
    let size: u32 = 15;

    for i in 0..size {
        let num = ((i + 1) * 10) as u8;
        value_array[i][31] = num;
    }

    // Calculate leaf hash
    let mut concatenated: [u8; 480] = [0; 480]; // 15 * 32
    let mut offset = 0;

    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value_array[i][j];
            offset += 1;
        }
    }

    let leaf_hash = keccak256(concatenated, size * 32);

    // Setup pairwise value that's too small (will cause failure)
    let mut pairwise = [0; 32];
    pairwise[31] = 100;

    // Call main - should fail because some values exceed pairwise limit
    main(
        value_array,
        size,
        leaf_hash,
        pairwise,
        pub_key_x,
        pub_key_y,
        signature,
        hashed_message,
        prover_address,
        counterparty_address,
        token_address,
        key,
    );
}
