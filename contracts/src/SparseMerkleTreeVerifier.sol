// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Sparse Merkle Tree verifier for 256-bit keys using keccak256.
/// @dev Proof ordering: proof[0] is the sibling at the leaf level (closest to leaf).
///      proof[i] corresponds to sibling at level i (0 = leaf level, 255 = root level).
library SparseMerkleProof {
    /// @notice Compute Merkle root from a leaf hash, a 256-bit key, and sibling proof.
    /// @param leafHash keccak256 hash of the leaf (e.g. keccak256(abi.encodePacked(key, value)) or your scheme)
    /// @param key the 32-byte key. The bit at position (255 - i) decides left/right at level i.
    /// @param proof siblings array (length should equal tree height used; variable length proofs OK).
    /// @return root computed root
    function computeRootFromProof(bytes32 leafHash, bytes32 key, bytes32[] memory proof)
        internal
        pure
        returns (bytes32 root)
    {
        // Start from the leaf hash
        bytes32 computed = leafHash;

        // For each level i, combine computed with proof[i].
        // Bit selection: take bit (255 - i) of key. If that bit == 1, current node is on the right:
        //   parent = keccak256(abi.encodePacked(sibling, computed))
        // else (bit == 0), current node is on the left:
        //   parent = keccak256(abi.encodePacked(computed, sibling))
        // proof[0] = sibling at leaf level (closest to leaf).
        uint256 keyInt = uint256(key);
        for (uint256 i = 0; i < proof.length; ++i) {
            bytes32 sibling = proof[i];
            // extract bit: most significant bit is level 0 (closest to root if you prefer); here we use MSB->level0 style
            // We want bit for level i counting from leaf up; use (255 - i)
            uint256 bit = (keyInt >> (255 - i)) & 1;
            if (bit == 1) {
                // current node is on the right, sibling is left
                computed = keccak256(abi.encodePacked(sibling, computed));
            } else {
                // current node is on the left, sibling is right
                computed = keccak256(abi.encodePacked(computed, sibling));
            }
        }
        root = computed;
    }

    /// @notice Verify inclusion: given root, key, value and proof, verify leaf is in tree.
    /// @param root expected root
    /// @param key leaf key (bytes32)
    /// @param value leaf value (bytes) — caller decides how to serialize; here we pass hashed leaf in caller
    /// @param proof sibling array
    /// @return true if proof computes to root
    function verifyInclusion(bytes32 root, bytes32 key, bytes32 value, bytes32[] memory proof)
        internal
        pure
        returns (bool)
    {
        // Example leaf hashing scheme: keccak256(abi.encodePacked(key, value))
        // You can change the leaf encoding to match your tree builder.
        bytes32 leafHash = keccak256(abi.encodePacked(key, value));
        return computeRootFromProof(leafHash, key, proof) == root;
    }
}
