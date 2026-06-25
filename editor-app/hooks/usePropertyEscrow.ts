"use client";

import { useMemo, useState } from "react";
import { createFlowVaultSdk } from "@/lib/flowvault";
import {
  buildDepositPostConditions,
  createEscrowStrategy,
  waitForTransactionSuccess,
} from "@/lib/escrow-flow";
import {
  buildEscrowSuccessState,
  validateEscrowInputs,
  type PropertyEscrowInputs,
  type EscrowSuccessState,
} from "@/lib/escrow-strategy";

type DepositStep = "idle" | "strategy" | "confirming" | "deposit";

export function usePropertyEscrow(walletAddress: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<DepositStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EscrowSuccessState | null>(null);

  const sdk = useMemo(
    () => (walletAddress ? createFlowVaultSdk(walletAddress) : null),
    [walletAddress]
  );

  async function submitEscrow(inputs: PropertyEscrowInputs) {
    setError(null);
    setSuccess(null);

    if (!walletAddress || !sdk) {
      setError("Connect wallet before making an offer.");
      return;
    }

    const validation = validateEscrowInputs({
      ...inputs,
      walletAddress,
    });
    if (validation.error) {
      setError(validation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      setStep("strategy");
      const created = await createEscrowStrategy({
        sdk,
        walletAddress,
        inputs: {
          ...inputs,
          walletAddress,
        },
      });

      setStep("confirming");
      await waitForTransactionSuccess(created.txId);

      setStep("deposit");
      const depositTransaction = await sdk.deposit(created.strategy.depositMicro, {
        postConditionMode: "deny",
        postConditions: buildDepositPostConditions({
          walletAddress,
          depositMicro: created.strategy.depositMicro,
        }),
      });

      setSuccess(
        buildEscrowSuccessState({
          earnestMicro: created.strategy.earnestMicro,
          commissionMicro: created.strategy.commissionMicro,
          liquidMicro: created.strategy.liquidMicro,
          lockUntilBlock: created.strategy.lockUntilBlock,
          strategyTxId: created.txId,
          depositTxId: depositTransaction.txId,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
      setStep("idle");
    }
  }

  return {
    isSubmitting,
    step,
    error,
    success,
    submitEscrow,
  };
}
