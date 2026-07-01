#!/usr/bin/env npx tsx
/**
 * Direct contract-call script for FlowVault cascade.
 * Bypasses flowvault-sdk to avoid BigInt compatibility issues with @stacks/transactions v7.
 */

import {
  makeContractCall,
  uintCV,
  standardPrincipalCV,
  noneCV,
  PostConditionMode,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToValue,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

const NETWORK = STACKS_TESTNET;

const PRIVATE_KEY =
  process.env.WALLET_PRIVATE_KEY ||
  "2b66f638a4dff4c2fe24e2877ec6cb96abb5a9a2193207d4d8065092904d795a01";

const FLOWVAULT = "STD7QG84VQQ0C35SZM2EYTHZV4M8FQ0R7YNSQWPD";
const FLOWVAULT_CONTRACT = "flowvault-v2";
const USDCX = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const USDCX_CONTRACT = "usdcx";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTx(txId: string, timeoutMs = 5 * 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  while (Date.now() < deadline) {
    const res = await fetch(`${NETWORK.client.baseUrl}/extended/v1/tx/${id}`);
    if (res.status === 404) { await sleep(5000); continue; }
    const data = (await res.json()) as any;
    if (data.tx_status === "success") return;
    if (data.tx_status && data.tx_status !== "pending") {
      throw new Error(`Tx ${id} failed: ${data.tx_status}`);
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for tx ${id}`);
}

async function callFlowVault(fn: string, args: any[]): Promise<string> {
  const tx = await makeContractCall({
    contractAddress: FLOWVAULT,
    contractName: FLOWVAULT_CONTRACT,
    functionName: fn,
    functionArgs: args,
    senderKey: PRIVATE_KEY,
    network: NETWORK,
    anchorMode: 1,
    postConditionMode: PostConditionMode.Allow,
  });
  const result = await broadcastTransaction({ transaction: tx, network: NETWORK });
  if ("error" in result && result.error) {
    throw new Error(`Broadcast error: ${result.error} - ${(result as any).reason}`);
  }
  return "txid" in result ? (result as any).txid : (result as any).txId;
}

async function readFlowVault(fn: string, args: any[], sender: string) {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: FLOWVAULT,
    contractName: FLOWVAULT_CONTRACT,
    functionName: fn,
    functionArgs: args,
    network: NETWORK,
    senderAddress: sender,
  });
  return cvToValue(cv);
}

async function getBlockHeight(): Promise<bigint> {
  const info = await fetch(`${NETWORK.client.baseUrl}/extended/v1/block`);
  const data = (await info.json()) as any;
  return BigInt(data.height || data.total);
}

async function main() {
  // Derive address
  const { getAddressFromPrivateKey } = require("@stacks/transactions");
  const address = getAddressFromPrivateKey(PRIVATE_KEY, NETWORK);

  console.log("Network: testnet");
  console.log("Wallet:", address);
  console.log("FlowVault:", `${FLOWVAULT}.${FLOWVAULT_CONTRACT}`);
  console.log("USDCx:", `${USDCX}.${USDCX_CONTRACT}`);

  // STX balance
  const stxRes = await fetch(`${NETWORK.client.baseUrl}/extended/v1/address/${address}/stx`);
  const stxData = (await stxRes.json()) as any;
  console.log("STX:", Number(stxData.balance) / 1e6, "STX");

  // USDCx balance
  try {
    const usdcxCv = await fetchCallReadOnlyFunction({
      contractAddress: USDCX,
      contractName: USDCX_CONTRACT,
      functionName: "get-balance",
      functionArgs: [standardPrincipalCV(address)],
      network: NETWORK,
      senderAddress: address,
    });
    console.log("USDCx:", cvToValue(usdcxCv).toString(), "microUSDCx =", Number(cvToValue(usdcxCv)) / 1e6, "USDCx");
  } catch (e) {
    console.log("USDCx: 0 (no balance or contract issue)");
  }

  const depositAmount = 1_000_000n; // 1 USDCx
  const lockAmount = depositAmount / 2n; // 0.5 USDCx locked
  const currentBlock = await getBlockHeight();
  const lockUntil = currentBlock + 144n;

  console.log(`\nDeposit: ${Number(depositAmount) / 1e6} USDCx`);
  console.log(`Lock: ${Number(lockAmount) / 1e6} USDCx until block ${lockUntil}`);
  console.log(`Hold (liquid): ${Number(depositAmount - lockAmount) / 1e6} USDCx`);

  // [1/3] clearRoutingRules
  console.log("\n[1/3] clearRoutingRules...");
  const clearTx = await callFlowVault("clear-routing-rules", []);
  console.log("  Tx:", clearTx);
  await waitForTx(clearTx);
  console.log("  Confirmed ✓");

  // [2/3] setRoutingRules
  console.log("\n[2/3] setRoutingRules...");
  const rulesTx = await callFlowVault("set-routing-rules", [
    uintCV(lockAmount),
    uintCV(lockUntil),
    noneCV(),       // no split address
    uintCV(0n),     // no split
  ]);
  console.log("  Tx:", rulesTx);
  await waitForTx(rulesTx);
  console.log("  Confirmed ✓");

  // [3/3] deposit
  console.log("\n[3/3] deposit USDCx...");
  const depositTx = await callFlowVault("deposit", [uintCV(depositAmount)]);
  console.log("  Tx:", depositTx);
  await waitForTx(depositTx);
  console.log("  Confirmed ✓");

  // Check vault state
  try {
    const state = await readFlowVault("get-vault-state", [standardPrincipalCV(address)], address);
    console.log("\nVault state:", JSON.stringify(state, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v, 2));
  } catch (e) {
    console.log("\nVault state: (could not read, may have succeeded)");
  }

  const id = depositTx.startsWith("0x") ? depositTx : "0x" + depositTx;
  console.log("\n" + "=".repeat(60));
  console.log("Cascade transaction complete!");
  console.log("Explorer: https://explorer.hiro.so/txid/" + id + "?chain=testnet");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
