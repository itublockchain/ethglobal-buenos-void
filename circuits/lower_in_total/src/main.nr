mod U256;
use U256::U256Bytes;
use keccak256::keccak256;

unconstrained fn main(
    value: [[u8; 32]; 50],
    size: u32,
    leaf_hash: pub [u8; 32],
    pairwise_value_bytes: pub [u8; 32],
) {
    let pairwise_value = U256Bytes::new(pairwise_value_bytes);
    
    let mut concatenated: [u8; 1600] = [0; 1600];
    let mut offset = 0;
    
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value[i][j];
            offset += 1;
        }
    }
    
    let calc_leaf_hash = keccak256(concatenated, size * 32);
    
    assert(leaf_hash == calc_leaf_hash);
    
    let mut cumulative = U256Bytes::zero();
    
    for i in 0..50 {
        let value_bytes = U256Bytes::new(value[i]);
        cumulative += value_bytes;
    }
    
    assert(cumulative <= pairwise_value);
}

#[test]
fn test_main() {
    let mut value_array: [[u8; 32]; 50] = [[0; 32]; 50];
    
    let size: u32 = 10;
    for i in 0..size {
        let num = ((i + 1) * 5) as u8;
        value_array[i][31] = num;
    }
    
    let mut concatenated: [u8; 320] = [0; 320];
    let mut offset = 0;
    
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value_array[i][j];
            offset += 1;
        }
    }
    
    let leaf_hash = keccak256(concatenated, size * 32);
    
    let mut pairwise = [0u8; 32];
    pairwise[31] = 44;
    pairwise[30] = 1;
    
 //Safety: aasd   
 unsafe {   main(value_array, size, leaf_hash, pairwise)}
}

#[test]
fn test_main_cumulative() {
    let mut value_array: [[u8; 32]; 50] = [[0; 32]; 50];
    
    let size: u32 = 5;
    for i in 0..size {
        let num = ((i + 1) * 10) as u8;
        value_array[i][31] = num;
    }
    
    let mut concatenated: [u8; 160] = [0; 160];
    let mut offset = 0;
    
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value_array[i][j];
            offset += 1;
        }
    }

    let leaf_hash = keccak256(concatenated, size * 32);
    
    let mut pairwise = [0u8; 32];
    pairwise[31] = 150;
    

 //Safety: aasd   
 unsafe {   main(value_array, size, leaf_hash, pairwise)}
}

#[test]
fn test_main_fail() {
    let mut value_array: [[u8; 32]; 50] = [[0; 32]; 50];
    
    let size: u32 = 5;
    for i in 0..size {
        let num = ((i + 1) * 10) as u8;
        value_array[i][31] = num;
    }
    
    let mut concatenated: [u8; 160] = [0; 160];
    let mut offset = 0;
    
    for i in 0..size {
        for j in 0..32 {
            concatenated[offset] = value_array[i][j];
            offset += 1;
        }
    }
    
    let leaf_hash = keccak256(concatenated, size * 32);
    
    let mut pairwise = [0u8; 32];
    pairwise[31] = 140; 
    pairwise[30] = 1;
    

 //Safety: aasd   
 unsafe {   main(value_array, size, leaf_hash, pairwise)}
}
