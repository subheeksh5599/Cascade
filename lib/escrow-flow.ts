import { Pc } from "@stacks/transactions";
import type { PostCondition } from "@stacks/transactions";
import type { RoutingRules, TransactionOptions, TransactionResult } from "flowvault-sdk";
import {
  FLOWVAULT_API_BASE,
  FLOWVAULT_CONTRACTS,
  FLOWVAULT_TOKEN_ASSET_NAME,
} from "@/lib/config";
import {
  buildEscrowStrategy,
  buildEscrowSuccessState,
  parseDepositAmount,
  type PropertyEscrowInputs,
  type EscrowStrategy,
  type EscrowSuccessState,
} from "@/lib/escrow-strategy";

export interface EscrowVaultSdk {
  getCurrentBlockHeight(senderAddress: string): Promise<number>;
  setRoutingRules(rules: RoutingRules, options?: TransactionOptions): Promise<TransactionResult>;
  deposit(amount: bigint | string, options?: TransactionOptions): Promise<TransactionResult>;
}

export interface EscrowDepositResult {
  strategy: EscrowStrategy;
  success: EscrowSuccessState;
}

function tokenContractId(): `${string}.${string}` {
  return `${FLOWVAULT_CONTRACTS.tokenContractAddress}.${FLOWVAULT_CONTRACTS.tokenContractName}`;
}

function vaultContractId(): `${string}.${string}` {
  return `${FLOWVAULT_CONTRACTS.contractAddress}.${FLOWVAULT_CONTRACTS.contractName}`;
}

export function buildDepositPostConditions(params: {
  walletAddress: string;
  depositMicro: bigint;
}): PostCondition[] {
  const token = tokenContractId();

  return [
    Pc.principal(params.walletAddress)
      .willSendLte(params.depositMicro)
      .ft(token, FLOWVAULT_TOKEN_ASSET_NAME),
    Pc.principal(vaultContractId())
      .willSendLte(params.depositMicro)
      .ft(token, FLOWVAULT_TOKEN_ASSET_NAME),
  ];
}

function normalizeTxId(txId: string): string {
  return txId.startsWith("0x") ? txId : `0x${txId}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTransactionSuccess(
  txId: string,
  options: {
    fetchImpl?: typeof fetch;
    pollIntervalMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? 10_000;
  const timeoutMs = options.timeoutMs ?? 10 * 60_000;
  const deadline = Date.now() + timeoutMs;
  const normalizedTxId = normalizeTxId(txId);

  while (Date.now() < deadline) {
    const response = await fetchImpl(`${FLOWVAULT_API_BASE}/extended/v1/tx/${normalizedTxId}`);

    if (response.status === 404) {
      await wait(pollIntervalMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Could not check transaction ${normalizedTxId}: ${response.status}`);
    }

    const payload = (await response.json()) as { tx_status?: string };
    const status = payload.tx_status;

    if (status === "success") return;

    if (status && status !== "pending") {
      throw new Error(`Transaction ${normalizedTxId} failed with status ${status}.`);
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for transaction ${normalizedTxId}.`);
}

export async function createEscrowStrategy(params: {
  sdk: EscrowVaultSdk;
  walletAddress: string;
  inputs: PropertyEscrowInputs;
}): Promise<{ strategy: EscrowStrategy; txId: string }> {
  const currentBlock = await params.sdk.getCurrentBlockHeight(params.walletAddress);
  const strategy = buildEscrowStrategy(params.inputs, currentBlock);

  const transaction = await params.sdk.setRoutingRules(
    {
      lockAmount: strategy.earnestMicro,
      lockUntilBlock: strategy.lockUntilBlock,
      splitAddress: strategy.agentAddress,
      splitAmount: strategy.commissionMicro,
    },
    {
      postConditionMode: "deny",
      postConditions: [],
    }
  );

  return {
    strategy,
    txId: transaction.txId,
  };
}

export async function runEscrowDeposit(params: {
  sdk: EscrowVaultSdk;
  walletAddress: string | null;
  inputs: PropertyEscrowInputs;
}): Promise<EscrowDepositResult> {
  if (!params.walletAddress) {
    throw new Error("Connect wallet before making an offer.");
  }

  const parsed = parseDepositAmount(params.inputs.depositAmount);
  if (parsed.error) throw new Error(parsed.error);

  const created = await createEscrowStrategy({
    sdk: params.sdk,
    walletAddress: params.walletAddress,
    inputs: {
      ...params.inputs,
      walletAddress: params.walletAddress,
    },
  });

  await waitForTransactionSuccess(created.txId);

  const depositTransaction = await params.sdk.deposit(created.strategy.depositMicro, {
    postConditionMode: "deny",
    postConditions: buildDepositPostConditions({
      walletAddress: params.walletAddress,
      depositMicro: created.strategy.depositMicro,
    }),
  });

  return {
    strategy: created.strategy,
    success: buildEscrowSuccessState({
      earnestMicro: created.strategy.earnestMicro,
      commissionMicro: created.strategy.commissionMicro,
      liquidMicro: created.strategy.liquidMicro,
      lockUntilBlock: created.strategy.lockUntilBlock,
      strategyTxId: created.txId,
      depositTxId: depositTransaction.txId,
    }),
  };
}
