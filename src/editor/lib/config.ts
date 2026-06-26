import { DEFAULT_CONTRACTS, type NetworkName } from "flowvault-sdk";

function readNetwork(): NetworkName {
  const value = import.meta.env.VITE_FLOWVAULT_NETWORK;
  return value === "mainnet" ? "mainnet" : "testnet";
}

export const FLOWVAULT_NETWORK = readNetwork();

export const FLOWVAULT_API_BASE =
  FLOWVAULT_NETWORK === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

export const FLOWVAULT_CONTRACTS = {
  contractAddress:
    import.meta.env.VITE_FLOWVAULT_CONTRACT_ADDRESS ??
    DEFAULT_CONTRACTS[FLOWVAULT_NETWORK].contractAddress,
  contractName:
    import.meta.env.VITE_FLOWVAULT_CONTRACT_NAME ??
    DEFAULT_CONTRACTS[FLOWVAULT_NETWORK].contractName,
  tokenContractAddress:
    import.meta.env.VITE_FLOWVAULT_TOKEN_CONTRACT_ADDRESS ??
    DEFAULT_CONTRACTS[FLOWVAULT_NETWORK].tokenContractAddress,
  tokenContractName:
    import.meta.env.VITE_FLOWVAULT_TOKEN_CONTRACT_NAME ??
    DEFAULT_CONTRACTS[FLOWVAULT_NETWORK].tokenContractName,
};

export const FLOWVAULT_TOKEN_ASSET_NAME =
  import.meta.env.VITE_FLOWVAULT_TOKEN_ASSET_NAME ?? "usdcx-token";

export function getHiroTxUrl(txId: string): string {
  const normalized = txId.startsWith("0x") ? txId : `0x${txId}`;
  return `https://explorer.hiro.so/txid/${normalized}?chain=${FLOWVAULT_NETWORK}`;
}
