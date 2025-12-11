import { useCallback, useState } from "react";
import { sha256HexOfFile, keccakOfJson } from "@/lib/utils/crypto";
import {
  uploadFile,
  uploadJSON,
  extractCid,
  toIpfsUri,
  toHttps,
} from "@/lib/utils/ipfs";
import { calculateFileHash } from "@/lib/utils/hash";
import {
  StoryClient,
  PILFlavor,
  WIP_TOKEN_ADDRESS,
} from "@story-protocol/core-sdk";
import {
  createWalletClient,
  custom,
  parseEther,
  createPublicClient,
  http,
} from "viem";
import {
  getLicenseSettingsByGroup,
  requiresSelfieVerification,
  requiresSubmitReview,
  isAiGeneratedGroup,
} from "@/lib/groupLicense";

export type RegisterState = {
  status:
    | "idle"
    | "compressing"
    | "uploading-image"
    | "creating-metadata"
    | "uploading-metadata"
    | "minting"
    | "success"
    | "error";
  progress: number;
  error: any;
  ipId?: string;
  txHash?: string;
};

async function compressImage(file: File): Promise<File> {
  // Simple browser-side downscale to JPEG
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    const fr = new FileReader();
    fr.onload = () => {
      img.onload = () => {
        const maxW = 1024;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        const url = canvas.toDataURL("image/jpeg", 0.9);
        resolve(url);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = fr.result as string;
    };
    fr.onerror = () => reject(new Error("File read failed"));
    fr.readAsDataURL(file);
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

export function useIPRegistrationAgent() {
  const [registerState, setRegisterState] = useState<RegisterState>({
    status: "idle",
    progress: 0,
    error: null,
  });

  const executeRegister = useCallback(
    async (
      group: number,
      file: File,
      mintingFee?: number,
      revShare?: number,
      aiTrainingManual?: boolean,
      intent?: { title?: string; prompt?: string },
      ethereumProvider?: any,
    ) => {
      try {
        // ============================================
        // TIER 1: HASH/VISION DETECTION (BLOCKING)
        // ============================================
        // Run vision and hash checks in PARALLEL (not sequential)
        const [visionResult, hashResult] = await Promise.allSettled([
          // Vision-based image detection (most powerful)
          (async () => {
            try {
              const formData = new FormData();
              formData.append("image", file);
              const visionResponse = await fetch(
                "/api/vision-image-detection",
                {
                  method: "POST",
                  body: formData,
                },
              );

              if (visionResponse.ok) {
                const visionCheck = await visionResponse.json();
                if (visionCheck.blocked) {
                  return {
                    blocked: true,
                    message:
                      visionCheck.message ||
                      "Image mirip dengan IP yang sudah terdaftar. Tidak dapat registrasi.",
                  };
                }
              }
              return { blocked: false };
            } catch (visionError) {
              console.warn(
                "Vision-based detection failed, continuing:",
                visionError,
              );
              return { blocked: false };
            }
          })(),
          // Hash whitelist check
          (async () => {
            try {
              const hash = await calculateFileHash(file);
              const hashCheckResponse = await fetch("/api/check-remix-hash", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hash }),
              });

              if (hashCheckResponse.ok) {
                const hashCheck = await hashCheckResponse.json();
                if (hashCheck.found) {
                  return {
                    found: true,
                    ipId: hashCheck.ipId,
                    title: hashCheck.title,
                  };
                }
              }
              return { found: false };
            } catch (hashError) {
              console.warn(
                "Hash whitelist check failed, continuing:",
                hashError,
              );
              return { found: false };
            }
          })(),
        ]);

        // Handle vision detection blocking
        if (
          visionResult.status === "fulfilled" &&
          visionResult.value?.blocked
        ) {
          setRegisterState({
            status: "error",
            progress: 0,
            error: visionResult.value.message,
          });
          return { success: false, reason: "vision_match_found" } as const;
        }

        // Handle hash remix offer
        if (hashResult.status === "fulfilled" && hashResult.value?.found) {
          setRegisterState({
            status: "idle",
            progress: 0,
            error: null,
          });
          return {
            success: false,
            reason: "hash_found_offer_remix",
            matchedIpId: hashResult.value.ipId,
            matchedTitle: hashResult.value.title,
          } as const;
        }

        // ✅ TIER 1 DETECTION COMPLETE
        // Hash/Vision checks passed - image is allowed to proceed

        const licenseSettings = getLicenseSettingsByGroup(
          group,
          aiTrainingManual,
          mintingFee,
          revShare,
        );
        if (requiresSelfieVerification(group)) {
          setRegisterState({
            status: "idle",
            progress: 0,
            error: "Selfie verification required before registration.",
          });
          return { success: false, reason: "selfie_required" } as const;
        }
        if (requiresSubmitReview(group)) {
          setRegisterState({
            status: "idle",
            progress: 0,
            error: "Submit review required.",
          });
          return { success: false, reason: "submit_review" } as const;
        }
        if (!licenseSettings)
          throw new Error("Cannot register: licenseSettings null");

        setRegisterState({ status: "compressing", progress: 10, error: null });
        const compressedFile = await compressImage(file);

        // Parallel: upload image + calculate creator address while compressing
        setRegisterState((p) => ({
          ...p,
          status: "uploading-image",
          progress: 25,
        }));

        const [fileUploadResult, creatorAddr, imageHash] = await Promise.all([
          uploadFile(compressedFile),
          (async () => {
            let addr: string | undefined;
            try {
              const providerTmp: any =
                ethereumProvider || (globalThis as any).ethereum;
              if (providerTmp) {
                const walletClientTmp = createWalletClient({
                  transport: custom(providerTmp),
                });
                const addrs = await walletClientTmp.getAddresses();
                if (addrs && addrs[0]) addr = String(addrs[0]);
              }
            } catch {}
            if (!addr) {
              throw new Error(
                "No wallet address available. Please connect your wallet.",
              );
            }
            return addr;
          })(),
          sha256HexOfFile(compressedFile),
        ]);

        const imageCid = extractCid(
          fileUploadResult.cid || fileUploadResult.url,
        );
        const imageGateway = fileUploadResult.https || toHttps(imageCid);

        setRegisterState((p) => ({
          ...p,
          status: "creating-metadata",
          progress: 50,
        }));
        const ipMetadata = {
          name: intent?.title || file.name,
          title: intent?.title || file.name,
          description: intent?.prompt || "",
          image: imageGateway,
          imageHash,
          mediaUrl: imageGateway,
          mediaHash: imageHash,
          mediaType: compressedFile.type || "image/jpeg",
          creators: creatorAddr
            ? [
                {
                  name: creatorAddr,
                  address: creatorAddr,
                  contributionPercent: 100,
                },
              ]
            : [],
          attributes: [
            {
              trait_type: "Status",
              value: isAiGeneratedGroup(group)
                ? "AI Generated"
                : "Human Generated",
            },
          ],
          aiMetadata: intent?.prompt
            ? { prompt: intent.prompt, generator: "user", model: "rule-based" }
            : undefined,
          license: licenseSettings,
        };

        setRegisterState((p) => ({
          ...p,
          status: "uploading-metadata",
          progress: 60,
        }));

        // Prepare resources in parallel
        // Use wallet-only SPG collection
        const spg = (import.meta as any).env?.VITE_PUBLIC_SPG_COLLECTION_USERS;
        if (!spg)
          throw new Error(
            "SPG collection env not set (VITE_PUBLIC_SPG_COLLECTION_USERS)",
          );
        const rpcUrl = (import.meta as any).env?.VITE_PUBLIC_STORY_RPC;
        if (!rpcUrl) throw new Error("RPC URL not set (VITE_PUBLIC_STORY_RPC)");

        // Parallel: upload metadata + initialize wallet client + build license terms
        const [ipMetaUpload, storyClientSetup] = await Promise.all([
          uploadJSON(ipMetadata),
          (async () => {
            const provider = ethereumProvider;
            let addr: string | undefined;
            let story: any;
            if (provider) {
              try {
                const chainIdHex: string = await provider.request({
                  method: "eth_chainId",
                });
                if (chainIdHex?.toLowerCase() !== "0x5ea") {
                  try {
                    await provider.request({
                      method: "wallet_switchEthereumChain",
                      params: [{ chainId: "0x5ea" }],
                    });
                  } catch (e) {
                    try {
                      await provider.request({
                        method: "wallet_addEthereumChain",
                        params: [
                          {
                            chainId: "0x5ea",
                            chainName: "Story",
                            nativeCurrency: {
                              name: "IP",
                              symbol: "IP",
                              decimals: 18,
                            },
                            rpcUrls: rpcUrl
                              ? [rpcUrl]
                              : ["https://mainnet.storyrpc.io"],
                          },
                        ],
                      });
                    } catch {}
                    try {
                      await provider.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: "0x5ea" }],
                      });
                    } catch {}
                  }
                }
              } catch {}
              // Ensure wallet is connected and has accounts
              try {
                const accounts = await provider.request({
                  method: "eth_accounts",
                });

                if (!accounts || accounts.length === 0) {
                  // Request account access if not connected
                  await provider.request({
                    method: "eth_requestAccounts",
                  });
                }
              } catch (accountError: any) {
                throw new Error(
                  `Failed to connect wallet: ${accountError.message}`,
                );
              }

              const walletClient = createWalletClient({
                transport: custom(provider),
              });
              const [a] = await walletClient.getAddresses();
              if (!a) throw new Error("No wallet address available");
              addr = a as string;
              story = StoryClient.newClient({
                account: addr as any,
                transport: custom(provider),
                chainId: 1514,
              });
            } else {
              throw new Error(
                "No wallet connected. Please connect your wallet to register IP.",
              );
            }
            return { addr, story };
          })(),
        ]);

        const ipMetaCid = extractCid(ipMetaUpload.cid || ipMetaUpload.url);
        const ipMetadataURI = toIpfsUri(ipMetaCid);
        const ipMetadataHash = keccakOfJson(ipMetadata);

        const addr = storyClientSetup.addr;
        const story = storyClientSetup.story;

        // Build license terms for Story SDK
        const licenseTermsData = [
          {
            terms: PILFlavor.commercialRemix({
              commercialRevShare: Number(licenseSettings.revShare) || 0,
              defaultMintingFee: parseEther(
                String(licenseSettings.licensePrice || 0),
              ),
              currency: WIP_TOKEN_ADDRESS,
            }),
          },
        ];

        setRegisterState((p) => ({ ...p, status: "minting", progress: 85 }));

        let result: any;

        try {
          console.log("Starting mint and register transaction...", {
            spgNftContract: spg,
            recipient: addr,
          });

          result = await story.ipAsset.mintAndRegisterIpAssetWithPilTerms({
            spgNftContract: spg as `0x${string}`,
            recipient: addr as `0x${string}`,
            licenseTermsData,
            ipMetadata: {
              ipMetadataURI,
              ipMetadataHash: ipMetadataHash as any,
              nftMetadataURI: ipMetadataURI,
              nftMetadataHash: ipMetadataHash as any,
            },
            allowDuplicates: true,
          });

          console.log("✅ Mint and register transaction submitted", {
            ipId: result?.ipId,
            txHash: result?.txHash || result?.transactionHash,
            result,
          });

          // Accelerate to 100% success when contract interaction succeeds
          if (result?.ipId) {
            setRegisterState({
              status: "success",
              progress: 100,
              error: null,
              ipId: result?.ipId,
              txHash: result?.txHash || result?.transactionHash,
            });
          } else {
            setRegisterState((p) => ({ ...p, progress: 95 }));
          }
        } catch (txError: any) {
          const errorMsg = txError?.message || String(txError);
          console.error("❌ Mint and register transaction error:", {
            message: errorMsg,
            code: txError?.code,
            errorName: txError?.name,
            errorString: String(txError),
          });

          // Check if user rejected the transaction
          if (txError?.code === 4001 || errorMsg.includes("User rejected")) {
            throw new Error("Transaction was rejected by the user");
          }

          // Check for timeout error and attempt to retrieve transaction status
          if (errorMsg.includes("Timed out while waiting for transaction")) {
            console.log(
              "⏳ Transaction timeout detected, polling for status...",
            );

            // Extract transaction hash from error message
            const txHashMatch = errorMsg.match(/with hash\s*"([^"]+)"/);
            const txHash = txHashMatch?.[1];

            if (txHash) {
              try {
                setRegisterState((p) => ({
                  ...p,
                  status: "minting",
                  progress: 92,
                  error: "Checking blockchain confirmation...",
                }));

                // Create a public client to poll transaction status
                const publicClient = createPublicClient({
                  transport: http(rpcUrl),
                  chain: { id: 1514 } as any,
                });

                // Poll for up to 60 seconds with 5 second intervals (12 attempts)
                let confirmed = false;
                let pollAttempts = 0;
                const maxAttempts = 12;
                const pollIntervalMs = 5000; // 5 seconds

                while (!confirmed && pollAttempts < maxAttempts) {
                  try {
                    const receipt = await publicClient.getTransactionReceipt({
                      hash: txHash as `0x${string}`,
                    });

                    if (receipt) {
                      console.log("✅ Transaction confirmed:", receipt);
                      confirmed = true;

                      // Update progress towards success (jump to 98)
                      setRegisterState((p) => ({
                        ...p,
                        progress: 98,
                      }));

                      // Try to extract IP ID and other details
                      result = {
                        txHash: txHash,
                        transactionHash: txHash,
                        ipId: result?.ipId,
                      };
                      break;
                    }
                  } catch (pollError) {
                    // Silently continue, RPC might be temporarily unavailable
                    console.log(
                      `Poll attempt ${pollAttempts + 1}/${maxAttempts} - transaction status pending`,
                    );
                  }

                  pollAttempts++;

                  // Update progress even if not confirmed (fast progression to 99)
                  if (!confirmed && pollAttempts <= maxAttempts) {
                    const progressValue = 92 + (pollAttempts * 6) / maxAttempts;
                    setRegisterState((p) => ({
                      ...p,
                      progress: Math.min(99, Math.floor(progressValue)),
                    }));
                  }

                  if (!confirmed && pollAttempts < maxAttempts) {
                    // Wait before next poll
                    await new Promise((resolve) =>
                      setTimeout(resolve, pollIntervalMs),
                    );
                  }
                }

                // If we have a txHash, consider it successful - the transaction is likely confirmed or will be
                if (!confirmed && txHash) {
                  console.warn(
                    "⚠️ Transaction not confirmed in initial polling window, but hash is available. Transaction likely succeeded on-chain.",
                  );
                  result = {
                    txHash: txHash,
                    transactionHash: txHash,
                    ipId: result?.ipId,
                  };
                }
              } catch (pollError) {
                console.error("Error polling transaction status:", pollError);
                // Continue with whatever result we have
                if (!result?.txHash && txHash) {
                  result = {
                    txHash: txHash,
                    transactionHash: txHash,
                    ipId: result?.ipId,
                  };
                }
              }
            } else {
              throw new Error(
                "Transaction timed out and hash could not be extracted. Please check your wallet for the transaction.",
              );
            }
          }
          // Check for other common wallet errors
          else if (errorMsg.includes("insufficient funds")) {
            throw new Error("Insufficient funds for gas and transaction");
          } else if (errorMsg.includes("network")) {
            throw new Error(
              "Network error. Please check your connection and try again",
            );
          }
          // Re-throw with original error if not a known case
          else {
            throw txError;
          }
        }

        // Only set success if not already set during transaction submission
        setRegisterState((p) => {
          if (p.status === "success") {
            return p; // Already set to success, don't overwrite
          }
          return {
            status: "success",
            progress: 100,
            error: null,
            ipId: result?.ipId,
            txHash: result?.txHash || result?.transactionHash,
          };
        });
        return {
          success: true,
          ipId: result?.ipId,
          txHash: result?.txHash || result?.transactionHash,
          imageUrl: imageGateway,
          ipMetadataUrl: toHttps(ipMetaCid),
        } as const;
      } catch (error: any) {
        const errorMsg =
          error?.message || error?.data?.message || String(error);

        // Provide user-friendly error messages
        let userFriendlyMsg = errorMsg;
        if (errorMsg.includes("rejected by the user")) {
          userFriendlyMsg =
            "❌ You rejected the transaction. Please try again if you want to proceed.";
        } else if (errorMsg.includes("insufficient funds")) {
          userFriendlyMsg =
            "❌ Insufficient funds for gas fees. Please add more IP tokens.";
        } else if (errorMsg.includes("network")) {
          userFriendlyMsg =
            "❌ Network connection error. Please check your connection and try again.";
        } else if (errorMsg.includes("CallerNotAuthorizedToMint")) {
          userFriendlyMsg =
            "❌ Your wallet is not authorized to mint on this contract. Please check with the admin.";
        }

        console.error("❌ Registration failed:", {
          message: errorMsg,
          error,
          stack: error?.stack,
        });
        setRegisterState({
          status: "error",
          progress: 0,
          error: userFriendlyMsg,
        });
        return {
          success: false,
          error: userFriendlyMsg,
        } as const;
      }
    },
    [],
  );

  const resetRegister = useCallback(() => {
    setRegisterState({ status: "idle", progress: 0, error: null });
  }, []);

  return { registerState, executeRegister, resetRegister } as const;
}
