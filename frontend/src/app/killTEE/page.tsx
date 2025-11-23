"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignMessage,
  useAccount,
} from "wagmi";
import { baseSepolia } from "viem/chains";
import { Button } from "@/components/ui/button";
import {
  VOID_CONTRACT_ADDRESS,
  VOID_CONTRACT_ABI,
} from "@/components/WalletDashboard/constants";
import { getLatestProofFromLocalStorage } from "@/lib/emergency-withdraw";

export default function KillTEEPage() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [teeDownError, setTeeDownError] = useState<string | null>(null);
  const [setStateError, setSetStateError] = useState<string | null>(null);
  const [isSetStateSigning, setIsSetStateSigning] = useState(false);

  // TeeDown transaction
  const {
    writeContract: writeTeeDown,
    data: teeDownHash,
    isPending: isTeeDownPending,
    error: teeDownWriteError,
  } = useWriteContract();

  const { isLoading: isTeeDownConfirming, isSuccess: isTeeDownSuccess } =
    useWaitForTransactionReceipt({
      hash: teeDownHash,
      chainId: baseSepolia.id,
    });

  // SetState transaction
  const {
    writeContract: writeSetState,
    data: setStateHash,
    isPending: isSetStatePending,
    error: setStateWriteError,
  } = useWriteContract();

  const { isLoading: isSetStateConfirming, isSuccess: isSetStateSuccess } =
    useWaitForTransactionReceipt({
      hash: setStateHash,
      chainId: baseSepolia.id,
    });

  const handleTeeDown = async () => {
    try {
      setTeeDownError(null);
      writeTeeDown({
        address: VOID_CONTRACT_ADDRESS,
        abi: VOID_CONTRACT_ABI,
        functionName: "TeeDown",
        chainId: baseSepolia.id,
      });
    } catch (err) {
      console.error("TeeDown failed:", err);
      setTeeDownError(err instanceof Error ? err.message : "TeeDown failed");
    }
  };

  const createStateRootSignature = async (
    stateRoot: string,
    term: number,
    functionName: string = "Challenge"
  ): Promise<string> => {
    if (!signMessageAsync || !address) {
      throw new Error("Wallet not connected");
    }

    // Create message to sign: stateRoot + term + contract address
    const message = `${functionName} State Root\nStateRoot: ${stateRoot}\nTerm: ${term}\nContract: ${VOID_CONTRACT_ADDRESS}`;

    // Sign the message
    const signature = await signMessageAsync({ message });

    // Convert signature to bytes32 (take first 66 chars: 0x + 64 hex chars)
    const signatureBytes32 = signature.slice(0, 66) as `0x${string}`;

    return signatureBytes32;
  };

  const getStateRootFromLocalStorage = (): string => {
    // Get proof from localStorage to extract root
    const proof = getLatestProofFromLocalStorage();

    if (!proof || !proof.root) {
      throw new Error(
        "No proof found in localStorage. Please make sure you have balances loaded."
      );
    }

    // Use root from localStorage proof
    let stateRoot = proof.root;

    // Ensure stateRoot has 0x prefix and is 66 chars (0x + 64 hex)
    if (!stateRoot.startsWith("0x")) {
      stateRoot = `0x${stateRoot}`;
    }

    // Pad to 66 chars if needed
    if (stateRoot.length < 66) {
      const hexPart = stateRoot.slice(2);
      stateRoot = `0x${hexPart.padStart(64, "0")}`;
    } else if (stateRoot.length > 66) {
      stateRoot = stateRoot.slice(0, 66);
    }

    return stateRoot;
  };

  const handleSetState = async () => {
    try {
      setSetStateError(null);
      setIsSetStateSigning(true);

      if (!address) {
        throw new Error("Please connect your wallet first");
      }

      // Get stateRoot from localStorage
      const stateRoot = getStateRootFromLocalStorage();
      const term = 0;

      console.log("Using stateRoot from localStorage for SetState:", stateRoot);

      // Create signature for StateRootInfo
      const signature = await createStateRootSignature(
        stateRoot,
        term,
        "SetState"
      );

      const rootInfo = {
        stateRoot: stateRoot as `0x${string}`,
        term: BigInt(term),
        signature: signature as `0x${string}`,
      };

      writeSetState({
        address: VOID_CONTRACT_ADDRESS,
        abi: VOID_CONTRACT_ABI,
        functionName: "SetState",
        args: [rootInfo],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      console.error("SetState failed:", err);
      setSetStateError(err instanceof Error ? err.message : "SetState failed");
    } finally {
      setIsSetStateSigning(false);
    }
  };

  // Update errors from write contract
  useEffect(() => {
    if (teeDownWriteError) {
      const errorMsg =
        teeDownWriteError instanceof Error
          ? teeDownWriteError.message
          : "TeeDown transaction failed";
      setTeeDownError(errorMsg);
    }
  }, [teeDownWriteError]);

  useEffect(() => {
    if (setStateWriteError) {
      const errorMsg =
        setStateWriteError instanceof Error
          ? setStateWriteError.message
          : "SetState transaction failed";
      setSetStateError(errorMsg);
    }
  }, [setStateWriteError]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">Kill TEE</h1>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-6">
          {/* TeeDown Button */}
          <div className="space-y-3">
            <Button
              onClick={handleTeeDown}
              disabled={isTeeDownPending || isTeeDownConfirming}
              className="w-full h-16 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isTeeDownPending || isTeeDownConfirming
                ? "Processing..."
                : isTeeDownSuccess
                ? "TEE Down Success!"
                : "TeeDown"}
            </Button>
            {teeDownError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-500">{teeDownError}</p>
              </div>
            )}
            {isTeeDownSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-sm text-green-500">
                  TEE marked as down! Transaction: {teeDownHash?.slice(0, 10)}
                  ...
                </p>
              </div>
            )}
          </div>

          {/* SetState Button */}
          <div className="space-y-3">
            <Button
              onClick={handleSetState}
              disabled={
                isSetStatePending ||
                isSetStateConfirming ||
                isSetStateSigning ||
                !address
              }
              className="w-full h-16 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isSetStateSigning
                ? "Signing..."
                : isSetStatePending || isSetStateConfirming
                ? "Processing..."
                : isSetStateSuccess
                ? "SetState Success!"
                : "SetState"}
            </Button>
            {setStateError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-500">{setStateError}</p>
              </div>
            )}
            {isSetStateSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-sm text-green-500">
                  State set successfully! Transaction:{" "}
                  {setStateHash?.slice(0, 10)}...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
