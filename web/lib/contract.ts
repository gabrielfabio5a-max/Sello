export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const FUJI_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113);

export const selloRegistryAbi = [
  {
    type: "function",
    name: "registerFingerprint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fingerprint", type: "bytes32" },
      { name: "title", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyFingerprint",
    stateMutability: "view",
    inputs: [{ name: "fingerprint", type: "bytes32" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "registeredBy", type: "address" },
      { name: "registeredAt", type: "uint64" },
      { name: "title", type: "string" },
    ],
  },
  {
    type: "function",
    name: "totalFingerprints",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
