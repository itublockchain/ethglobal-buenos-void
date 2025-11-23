// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

/// @notice Sparse Merkle Tree verifier for 256-bit keys using keccak256.
library SparseMerkleProof {
    function computeRootFromProof(bytes32 leafHash, bytes32 key, bytes32[] memory proof)
        internal
        pure
        returns (bytes32 root)
    {
        bytes32 computed = leafHash;
        uint256 keyInt = uint256(key);

        for (uint256 i = proof.length - 1; i >= 0; i--) {
            bytes32 sibling = proof[i];
            uint256 bit = (keyInt >> i) & 1;

            if (bit == 1) {
                computed = keccak256(abi.encodePacked(sibling, computed));
            } else {
                computed = keccak256(abi.encodePacked(computed, sibling));
            }

            if (i == 0) break; // Prevent underflow
        }

        root = computed;
    }

    function verifyInclusion(bytes32 root, bytes32 key, bytes32 value, bytes32 id, bytes32[] memory proof)
        internal
        pure
        returns (bool)
    {
        bytes32 leafHash = keccak256(abi.encodePacked(key, value, id));
        return computeRootFromProof(leafHash, key, proof) == root;
    }
}

contract SparseMerkleProofTest is Test {
    using SparseMerkleProof for *;

    function testVerifyInclusionWithProvidedData() public {
        // Key and Value from your data
        bytes32 id = 0x0000000000000000000000000000000000000000000000000000000000000001;
        bytes32 key = 0xde004664e6c573ddfa2c83876b8b7934ca1d97e1b13c26bdc829bf71204451e3;
        bytes32 value = 0x331058a0bf2f5e3120811a6c1ca1f6a9575699545077b2f861c90958a6eb5187;

        // Expected root from your JSON
        bytes32 expectedRoot = 0xbb9ab7e976e11ca1ad7cebe54a19de3b825c582e36f54eced930b42e31285ad5;

        // Sidenodes (proof) from your JSON
        bytes32[] memory proof = new bytes32[](2);
        proof[0] = 0xfc9ca8fa576f532b067b07e483c2c92f0e612767878591ca0589ec75421fe719;
        proof[1] = 0x811ffae09e422cc3f191b26bd81a687aad959fc0cb5df8b5a038bd794a561246;

        // Verify inclusion
        bool isValid = SparseMerkleProof.verifyInclusion(expectedRoot, key, value, id, proof);

        assertTrue(isValid, "Proof verification should succeed");
    }

    function testVerifyInclusionWithSecondProof() public pure {
        // Key and Value from second proof data
        bytes32 id = 0x0000000000000000000000000000000000000000000000000000000000000001;
        bytes32 key = 0x783bba0b7e7219f5c537dbd624e67b4730a119839f15125557941be73caeaa20;
        bytes32 value = 0x571c63d587e2038dbb7ff7e7f367baacd14db36a000cfe4bb3a8a18e9335a93b;
        bytes32 expectedRoot = 0x94094699af2d08b7a287954d56188e6ffe540c80f679e4fcd0c01967bbc91bf1;

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = 0x819dfa2964509c7122596502a9e6215e81eaef8a151e506e0b72c6c58469ab7c;

        console.log("Second Proof Test:");
        console.log("Key:");
        console.logBytes32(key);
        console.log("Value:");
        console.logBytes32(value);
        console.log("Expected Root:");
        console.logBytes32(expectedRoot);

        bool isValid = SparseMerkleProof.verifyInclusion(expectedRoot, key, value, id, proof);
        console.log("Proof valid:", isValid);

        assertTrue(isValid, "Second proof verification should succeed");
    }

    function testComputeRootFromSecondProof() public pure {
        bytes32 id = 0x0000000000000000000000000000000000000000000000000000000000000001;
        bytes32 key = 0x783bba0b7e7219f5c537dbd624e67b4730a119839f15125557941be73caeaa20;
        bytes32 value = 0x571c63d587e2038dbb7ff7e7f367baacd14db36a000cfe4bb3a8a18e9335a93b;
        bytes32 expectedRoot = 0x94094699af2d08b7a287954d56188e6ffe540c80f679e4fcd0c01967bbc91bf1;

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = 0x819dfa2964509c7122596502a9e6215e81eaef8a151e506e0b72c6c58469ab7c;

        // Compute leaf hash
        bytes32 leafHash = keccak256(abi.encodePacked(key, value, id));

        console.log("Leaf Hash:");
        console.logBytes32(leafHash);

        // Compute root
        bytes32 computedRoot = SparseMerkleProof.computeRootFromProof(leafHash, key, proof);

        console.log("Computed Root:");
        console.logBytes32(computedRoot);
        console.log("Expected Root:");
        console.logBytes32(expectedRoot);

        assertEq(computedRoot, expectedRoot, "Computed root should match expected root for second proof");
    }

    function testComputeRootFromProof() public pure {
        bytes32 id = 0x0000000000000000000000000000000000000000000000000000000000000001;
        bytes32 key = 0x2f87575c663c702e1bf72cbbc735765ff9c245cd9715448221e8382c839f7693;
        bytes32 value = 0x8aefc03ee180b2211fb30d7efdade5645dd2f08370af88916365a127f5bcf890;
        bytes32 expectedRoot = 0x8d027b16732941431e4205386fc94002ba1f76060362d29fa88535cbe9bcc942;

        bytes32[] memory proof = new bytes32[](4);
        proof[0] = 0xf8af3972197d0ea98f95f3434de796302393349a869982d0a0032bcab1763798;
        proof[1] = 0x04c15daadfe2b422f16007d5a2f95c7762e8e5b8f74341152dc32428a63297ff;
        proof[2] = 0x0000000000000000000000000000000000000000000000000000000000000000;
        proof[3] = 0xe0ae2193217db86e7844483f2562eaa4e73da551dfabe60c3ec0103f8099c126;

        // Compute leaf hash
        bytes32 leafHash = keccak256(abi.encodePacked(key, value, id));

        console.log("Leaf Hash:");
        console.logBytes32(leafHash);

        // Compute root
        bytes32 computedRoot = SparseMerkleProof.computeRootFromProof(leafHash, key, proof);

        console.log("Computed Root:");
        console.logBytes32(computedRoot);
        console.log("Expected Root:");
        console.logBytes32(expectedRoot);

        assertEq(computedRoot, expectedRoot, "Computed root should match expected root for second proof");
    }

    function testComputeRootFromthirdProof() public pure {
        bytes32 id = 0x0000000000000000000000000000000000000000000000000000000000000001;
        bytes32 key = 0x697de09d452fe9cfd666fc487e6f05c5d31aba48da987ea00b9fef926f87ba4b;
        bytes32 value = 0x000000000000000000000000000000000000000000000000000001d1a94a2000;
        bytes32 expectedRoot = 0x7a64801085510289e8caa7488b9cc03a2f0511859d8eeae0f3ae040c12d3cdd2;

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = 0x32d1515cbdbd61df6fd84b59d87af9c29379064481e5c7261edddc26fca90d1b;

        // Compute leaf hash
        bytes32 leafHash = keccak256(abi.encodePacked(key, value, id));

        console.log("Leaf Hash:");
        console.logBytes32(leafHash);

        // Compute root
        bytes32 computedRoot = SparseMerkleProof.computeRootFromProof(leafHash, key, proof);

        console.log("Computed Root:");
        console.logBytes32(computedRoot);
        console.log("Expected Root:");
        console.logBytes32(expectedRoot);

        assertEq(computedRoot, expectedRoot, "Computed root should match expected root for second proof");
    }
}
