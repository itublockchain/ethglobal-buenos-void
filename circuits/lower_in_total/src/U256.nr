fn add256(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    let mut res: [u8; 32] = [0; 32];
    let mut carry: u16 = 0;
    for i in 0..32 {
        let sum: u16 = carry + a[i] as u16 + b[i] as u16;
        res[i] = (sum & 0xFF) as u8;
        carry = sum >> 8;
    }
    res
}

fn sub256(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    let mut res: [u8; 32] = [0; 32];
    let mut borrow: i16 = 0;
    for i in 0..32 {
        let diff: i16 = a[i] as i16 - b[i] as i16 - borrow;
        if diff < 0 {
            res[i] = (diff + 256) as u8;
            borrow = 1;
        } else {
            res[i] = diff as u8;
            borrow = 0;
        }
    }
    res
}

fn mul256(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    let mut tmp: [u32; 64] = [0; 64];

    for i in 0..32 {
        for j in 0..32 {
            tmp[i + j] = tmp[i + j] + (a[i] as u32) * (b[j] as u32);
        }
    }

    let mut res: [u8; 32] = [0; 32];
    let mut carry: u32 = 0;
    for k in 0..32 {
        let sum: u32 = tmp[k] + carry;
        res[k] = (sum & 0xFF) as u8;
        carry = sum >> 8;
    }
    res
}

use std::cmp::{Eq, Ord, Ordering};
use std::ops::{Add, Mul, Sub};

pub struct U256Bytes {
    pub limbs: [u8; 32],
}

impl U256Bytes {
    pub fn new(limbs: [u8; 32]) -> Self {
        U256Bytes { limbs }
    }

    pub fn zero() -> Self {
        U256Bytes { limbs: [0; 32] }
    }
}

impl Add for U256Bytes {
    fn add(self, other: U256Bytes) -> U256Bytes {
        U256Bytes { limbs: add256(self.limbs, other.limbs) }
    }
}

impl Sub for U256Bytes {
    fn sub(self, other: U256Bytes) -> U256Bytes {
        U256Bytes { limbs: sub256(self.limbs, other.limbs) }
    }
}

impl Mul for U256Bytes {
    fn mul(self, other: U256Bytes) -> U256Bytes {
        U256Bytes { limbs: mul256(self.limbs, other.limbs) }
    }
}

impl Eq for U256Bytes {
    fn eq(self, other: U256Bytes) -> bool {
        let mut is_eq: bool = true;
        for i in 0..32 {
            is_eq = is_eq & (self.limbs[i] == other.limbs[i]);
        }
        is_eq
    }
}

impl Ord for U256Bytes {
    fn cmp(self, other: U256Bytes) -> Ordering {
        let mut less_flag: bool = false;
        let mut greater_flag: bool = false;
        let mut prefix_equal: bool = true;

        for i in 0..32 {
            let a = self.limbs[i];
            let b = other.limbs[i];
            let eq = a == b;
            let lt = a < b;
            let gt = a > b;

            less_flag = less_flag | (prefix_equal & lt);
            greater_flag = greater_flag | (prefix_equal & gt);
            prefix_equal = prefix_equal & eq;
        }

        if greater_flag {
            Ordering::greater()
        } else if less_flag {
            Ordering::less()
        } else {
            Ordering::equal()
        }
    }
}
