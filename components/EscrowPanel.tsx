"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { usePropertyEscrow } from "@/hooks/usePropertyEscrow";
import { useStacksWallet } from "@/hooks/useStacksWallet";
import { getHiroTxUrl } from "@/lib/config";
import {
  PROPERTY_LOCK_DURATION_BLOCKS,
  calculateEscrowBreakdown,
  formatPercent,
  formatUsdcx,
  parseDepositAmount,
  parsePercent,
  validateEscrowInputs,
} from "@/lib/escrow-strategy";

const AGENT_ADDRESS = "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2SWW3M3";

function shortTx(txId: string): string {
  return txId.length > 18 ? `${txId.slice(0, 10)}...${txId.slice(-6)}` : txId;
}

function canLinkTx(txId: string): boolean {
  return txId.startsWith("0x") && txId.length > 12;
}

export function EscrowPanel() {
  const [depositAmount, setDepositAmount] = useState("500000");
  const [earnestPercent, setEarnestPercent] = useState("60");
  const [commissionPercent, setCommissionPercent] = useState("5");
  const [hasAttempted, setHasAttempted] = useState(false);

  const wallet = useStacksWallet();
  const escrow = usePropertyEscrow(wallet.address);

  const parsedDeposit = parseDepositAmount(depositAmount);
  const parsedEarnest = parsePercent(earnestPercent, "");
  const parsedCommission = parsePercent(commissionPercent, "");

  const preview = (() => {
    if (parsedDeposit.error || parsedEarnest.error || parsedCommission.error) {
      return calculateEscrowBreakdown({ depositMicro: 0n, earnestPercent: 0, commissionPercent: 0 });
    }
    if (parsedEarnest.percent + parsedCommission.percent > 100) {
      return calculateEscrowBreakdown({
        depositMicro: parsedDeposit.microAmount,
        earnestPercent: parsedEarnest.percent,
        commissionPercent: Math.max(0, 100 - parsedEarnest.percent),
      });
    }
    return calculateEscrowBreakdown({
      depositMicro: parsedDeposit.microAmount,
      earnestPercent: parsedEarnest.percent,
      commissionPercent: parsedCommission.percent,
    });
  })();

  const liquidPercent = Math.max(0, 100 - parsedEarnest.percent - parsedCommission.percent);

  const pendingMsg =
    escrow.step === "strategy"
      ? "Confirm escrow strategy in wallet."
      : escrow.step === "confirming"
        ? "Waiting for on-chain confirmation."
        : escrow.step === "deposit"
          ? "Confirm USDCx deposit in wallet."
          : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasAttempted(true);
    await escrow.submitEscrow({
      depositAmount,
      earnestPercent,
      agentCommissionPercent: commissionPercent,
      agentAddress: AGENT_ADDRESS,
    });
  }

  return (
    <section className="escrow-cta">
      <div className="escrow-cta__inner">
        <div className="escrow-cta__head">
          <span className="accent-eyebrow">FlowVault Live Demo</span>
          <h2>Execute a Property Escrow</h2>
          <p>
            Deposit USDCx into FlowVault. Your earnest money is <strong>Locked</strong> until
            closing. Your agent&apos;s commission is <strong>Split</strong> instantly. The rest
            stays <strong>Hold</strong>&mdash;liquid. All three FlowVault primitives, one transaction,
            verifiable on the Stacks testnet explorer.
          </p>
        </div>

        {!wallet.isConnected ? (
          <div className="escrow-cta__connect">
            <WalletButton />
            <span className="escrow-cta__hint">Connect a Stacks testnet wallet to make an offer</span>
          </div>
        ) : (
          <form className="escrow-cta__form" onSubmit={handleSubmit}>
            <div className="escrow-cta__grid">
              <div className="escrow-cta__deposit">
                <span className="escrow-cta__label">Total Deposit</span>
                <div className="escrow-cta__deposit-row">
                  <input
                    className="escrow-amount-input"
                    type="number"
                    min="0"
                    step="0.000001"
                    inputMode="decimal"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <span className="escrow-currency">USDCx</span>
                </div>
              </div>

              <div className="escrow-cta__splits">
                <SplitCard
                  icon="◆"
                  label="Earnest Money"
                  pct={parsedEarnest.percent}
                  amt={escrow.success?.earnestMicro ?? preview.earnestMicro}
                  note="Locked until closing"
                  value={earnestPercent}
                  onChange={setEarnestPercent}
                  variant="earnest"
                />
                <SplitCard
                  icon="◇"
                  label="Agent Commission"
                  pct={parsedCommission.percent}
                  amt={escrow.success?.commissionMicro ?? preview.commissionMicro}
                  note="Routed to agent"
                  value={commissionPercent}
                  onChange={setCommissionPercent}
                  variant="commission"
                />
                <div className="split-liquid">
                  <span className="split-liquid__label">Liquid</span>
                  <strong>{formatUsdcx(escrow.success?.liquidMicro ?? preview.liquidMicro)}</strong>
                  <span>{formatPercent(liquidPercent)}</span>
                </div>
              </div>
            </div>

            <div className="escrow-cta__actions">
              <div className="escrow-cta__steps">
                <span className={`escrow-step ${escrow.step === "strategy" ? "escrow-step--active" : ""}`}>Strategy</span>
                <span className={`escrow-step ${escrow.step === "confirming" ? "escrow-step--active" : ""}`}>Confirm</span>
                <span className={`escrow-step ${escrow.step === "deposit" ? "escrow-step--active" : ""}`}>Deposit</span>
                <span className={`escrow-step ${escrow.success ? "escrow-step--active" : ""}`}>Done</span>
              </div>
              <button className="btn-accent" type="submit" disabled={escrow.isSubmitting}>
                {escrow.isSubmitting ? "Processing..." : "Make Offer"}
              </button>
            </div>

            {((hasAttempted && validateEscrowInputs({
              depositAmount,
              earnestPercent,
              agentCommissionPercent: commissionPercent,
              agentAddress: AGENT_ADDRESS,
              walletAddress: wallet.address,
            }).error) || escrow.error) && (
              <div className="status-panel error" style={{ marginTop: 16 }}>
                {(hasAttempted ? validateEscrowInputs({
                  depositAmount,
                  earnestPercent,
                  agentCommissionPercent: commissionPercent,
                  agentAddress: AGENT_ADDRESS,
                  walletAddress: wallet.address,
                }).error : null) ?? escrow.error}
              </div>
            )}
            {pendingMsg && <div className="status-panel pending" style={{ marginTop: 16 }}>{pendingMsg}</div>}
            {escrow.success && (
              <>
                <div className="status-panel success" style={{ marginTop: 16 }}>
                  <strong>{escrow.success.message}</strong>
                  <span>Unlocks at block {escrow.success.lockUntilBlock}</span>
                </div>
                <div className="tx-links" style={{ marginTop: 12 }}>
                  {[
                    { label: "Strategy", txId: escrow.success.strategyTxId },
                    { label: "Deposit", txId: escrow.success.depositTxId },
                  ].map(({ label, txId }) =>
                    canLinkTx(txId) ? (
                      <a key={txId} href={getHiroTxUrl(txId)} target="_blank" rel="noreferrer">
                        {label}: {shortTx(txId)}
                      </a>
                    ) : (
                      <span key={txId}>{label}: {txId}</span>
                    )
                  )}
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function SplitCard({
  icon,
  label,
  pct,
  amt,
  note,
  value,
  onChange,
  variant,
}: {
  icon: string;
  label: string;
  pct: number;
  amt: bigint;
  note: string;
  value: string;
  onChange: (v: string) => void;
  variant: "earnest" | "commission";
}) {
  return (
    <div className={`split-card split-card--${variant}`}>
      <div className="split-card__head">
        <span className="split-card__icon">{icon}</span>
        <span className="split-card__label">{label}</span>
        <span className="split-card__pct">{pct || 0}%</span>
      </div>
      <input
        className="split-card__input"
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className="split-card__range"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="split-card__amt">
        <strong>{formatUsdcx(amt)}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}
