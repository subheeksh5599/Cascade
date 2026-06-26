import { isValidAddress, microToToken, tokenToMicro } from "flowvault-sdk";

export const PROPERTY_LOCK_DURATION_BLOCKS = 432;

export interface PropertyEscrowInputs {
  depositAmount: string;
  earnestPercent: string;
  agentCommissionPercent: string;
  agentAddress: string;
  walletAddress?: string | null;
}

export interface EscrowBreakdown {
  depositMicro: bigint;
  earnestMicro: bigint;
  commissionMicro: bigint;
  liquidMicro: bigint;
}

export interface EscrowStrategy extends EscrowBreakdown {
  lockUntilBlock: number;
  agentAddress: string;
}

export interface EscrowSuccessState {
  message: string;
  earnestMicro: bigint;
  commissionMicro: bigint;
  liquidMicro: bigint;
  lockUntilBlock: number;
  strategyTxId: string;
  depositTxId: string;
}

export function parseDepositAmount(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { microAmount: 0n, error: "Enter a deposit amount." };
  }

  if (trimmed.startsWith("-")) {
    return { microAmount: 0n, error: "Deposit amount must be greater than 0." };
  }

  try {
    const microAmount = tokenToMicro(trimmed);
    if (microAmount <= 0n) {
      return { microAmount: 0n, error: "Deposit amount must be greater than 0." };
    }
    return { microAmount, error: null };
  } catch {
    return {
      microAmount: 0n,
      error: "Enter a valid USDCx amount.",
    };
  }
}

export function parsePercent(input: string, label: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { percent: 0, microPercent: 0n, error: `Enter a ${label}.` };
  }

  const percent = Number(trimmed);
  if (!Number.isFinite(percent)) {
    return { percent: 0, microPercent: 0n, error: `${label} must be a number.` };
  }

  if (percent < 0 || percent > 100) {
    return { percent: 0, microPercent: 0n, error: `${label} must be between 0 and 100.` };
  }

  return {
    percent,
    microPercent: BigInt(Math.round(percent * 100)),
    error: null,
  };
}

export function calculateEscrowBreakdown(params: {
  depositMicro: bigint;
  earnestPercent: number;
  commissionPercent: number;
}): EscrowBreakdown {
  const basisPointDenominator = 10_000n;
  const earnestBps = BigInt(Math.round(params.earnestPercent * 100));
  const commissionBps = BigInt(Math.round(params.commissionPercent * 100));

  const earnestMicro = (params.depositMicro * earnestBps) / basisPointDenominator;
  const commissionMicro = (params.depositMicro * commissionBps) / basisPointDenominator;
  const liquidMicro = params.depositMicro - earnestMicro - commissionMicro;

  return {
    depositMicro: params.depositMicro,
    earnestMicro,
    commissionMicro,
    liquidMicro,
  };
}

export function validateEscrowInputs(inputs: PropertyEscrowInputs): { error: string | null } {
  const parsedDeposit = parseDepositAmount(inputs.depositAmount);
  const parsedEarnest = parsePercent(inputs.earnestPercent, "earnest money percentage");
  const parsedCommission = parsePercent(inputs.agentCommissionPercent, "agent commission percentage");
  const agentAddress = inputs.agentAddress.trim();

  if (parsedDeposit.error) return { error: parsedDeposit.error };
  if (parsedEarnest.error) return { error: parsedEarnest.error };
  if (parsedCommission.error) return { error: parsedCommission.error };

  if (parsedEarnest.percent <= 0) return { error: "Earnest money percentage must be greater than 0." };
  if (parsedCommission.percent <= 0) return { error: "Agent commission percentage must be greater than 0." };

  if (parsedEarnest.percent + parsedCommission.percent > 100) {
    return { error: "Earnest money plus agent commission cannot exceed 100%." };
  }

  if (!agentAddress) return { error: "Enter the agent's Stacks address." };
  if (!isValidAddress(agentAddress)) return { error: "Enter a valid Stacks testnet agent address." };

  if (inputs.walletAddress && agentAddress === inputs.walletAddress) {
    return { error: "Agent address cannot be the same as your wallet." };
  }

  const breakdown = calculateEscrowBreakdown({
    depositMicro: parsedDeposit.microAmount,
    earnestPercent: parsedEarnest.percent,
    commissionPercent: parsedCommission.percent,
  });

  if (breakdown.earnestMicro <= 0n) {
    return { error: "Deposit is too small for the selected earnest percentage." };
  }

  if (breakdown.commissionMicro <= 0n) {
    return { error: "Deposit is too small for the selected commission percentage." };
  }

  return { error: null };
}

export function buildEscrowStrategy(
  inputs: PropertyEscrowInputs,
  currentBlock: number
): EscrowStrategy {
  if (!Number.isFinite(currentBlock) || !Number.isInteger(currentBlock) || currentBlock < 0) {
    throw new Error("Current block height is unavailable.");
  }

  const validation = validateEscrowInputs(inputs);
  if (validation.error) throw new Error(validation.error);

  const parsedDeposit = parseDepositAmount(inputs.depositAmount);
  const breakdown = calculateEscrowBreakdown({
    depositMicro: parsedDeposit.microAmount,
    earnestPercent: Number(inputs.earnestPercent),
    commissionPercent: Number(inputs.agentCommissionPercent),
  });

  return {
    ...breakdown,
    lockUntilBlock: currentBlock + PROPERTY_LOCK_DURATION_BLOCKS,
    agentAddress: inputs.agentAddress.trim(),
  };
}

export function buildEscrowSuccessState(params: {
  earnestMicro: bigint;
  commissionMicro: bigint;
  liquidMicro: bigint;
  lockUntilBlock: number;
  strategyTxId: string;
  depositTxId: string;
}): EscrowSuccessState {
  return {
    message: "Property escrow configured on Velar",
    earnestMicro: params.earnestMicro,
    commissionMicro: params.commissionMicro,
    liquidMicro: params.liquidMicro,
    lockUntilBlock: params.lockUntilBlock,
    strategyTxId: params.strategyTxId,
    depositTxId: params.depositTxId,
  };
}

export function formatUsdcx(microAmount: bigint): string {
  return `${microToToken(microAmount.toString())} USDCx`;
}

export function formatPercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1)}%`;
}
