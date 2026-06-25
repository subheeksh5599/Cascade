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

const PENALTY_ADDRESS = "ST35GP7N96HNGD9CYEBKBGFKKCWRBYKZX9QJ90YR";

function shortTx(txId: string): string {
  return txId.length > 18 ? `${txId.slice(0, 10)}...${txId.slice(-6)}` : txId;
}
function canLinkTx(txId: string): boolean {
  return txId.startsWith("0x") && txId.length > 12;
}

export function GoalStaking() {
  const [stakeAmount, setStakeAmount] = useState("500000");
  const [lockPercent, setLockPercent] = useState("90");
  const [penaltyPercent, setPenaltyPercent] = useState("10");
  const [hasAttempted, setHasAttempted] = useState(false);

  const wallet = useStacksWallet();
  const escrow = usePropertyEscrow(wallet.address);

  const parsedStake = parseDepositAmount(stakeAmount);
  const parsedLock = parsePercent(lockPercent, "lock");
  const parsedPenalty = parsePercent(penaltyPercent, "penalty");

  const preview = (() => {
    if (parsedStake.error || parsedLock.error || parsedPenalty.error) {
      return calculateEscrowBreakdown({ depositMicro: 0n, earnestPercent: 0, commissionPercent: 0 });
    }
    if (parsedLock.percent + parsedPenalty.percent > 100) {
      return calculateEscrowBreakdown({
        depositMicro: parsedStake.microAmount,
        earnestPercent: parsedLock.percent,
        commissionPercent: Math.max(0, 100 - parsedLock.percent),
      });
    }
    return calculateEscrowBreakdown({
      depositMicro: parsedStake.microAmount,
      earnestPercent: parsedLock.percent,
      commissionPercent: parsedPenalty.percent,
    });
  })();

  const liquidPercent = Math.max(0, 100 - parsedLock.percent - parsedPenalty.percent);

  const pendingMsg =
    escrow.step === "strategy" ? "Confirm strategy in your wallet." :
    escrow.step === "confirming" ? "Waiting for on-chain confirmation." :
    escrow.step === "deposit" ? "Confirm USDCx deposit in wallet." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasAttempted(true);
    await escrow.submitEscrow({
      depositAmount: stakeAmount,
      earnestPercent: lockPercent,
      agentCommissionPercent: penaltyPercent,
      agentAddress: PENALTY_ADDRESS,
    });
  }

  const validationError = hasAttempted ? validateEscrowInputs({
    depositAmount: stakeAmount,
    earnestPercent: lockPercent,
    agentCommissionPercent: penaltyPercent,
    agentAddress: PENALTY_ADDRESS,
    walletAddress: wallet.address,
  }).error : null;

  return (
    <section className="escrow-cta">
      <div className="escrow-cta__inner">
        <div className="escrow-cta__head">
          <h2>Stake Your Goal</h2>
          <p>
            Deposit USDCx into FlowVault. Your stake is <strong>Locked</strong> until
            the deadline. A <strong>Split</strong> pre-commits your penalty. The rest
            stays <strong>Hold</strong>. Three primitives. One transaction. Verifiable on-chain.
          </p>
        </div>

        {!wallet.isConnected ? (
          <div className="escrow-cta__connect">
            <WalletButton />
            <span className="escrow-cta__hint">Connect Stacks testnet wallet to stake a goal</span>
          </div>
        ) : (
          <form className="escrow-cta__form" onSubmit={handleSubmit}>
            <div className="escrow-cta__grid">
              <div className="escrow-cta__deposit">
                <span className="escrow-cta__label">Total Stake</span>
                <div className="escrow-cta__deposit-row">
                  <input className="escrow-amount-input" type="number" min="0" step="0.000001" inputMode="decimal"
                    value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
                  <span className="escrow-currency">USDCx</span>
                </div>
              </div>
              <div className="escrow-cta__splits">
                <SplitCard icon="◆" label="Locked Stake" pct={parsedLock.percent} amt={escrow.success?.earnestMicro ?? preview.earnestMicro} note="Locked until deadline" value={lockPercent} onChange={setLockPercent} variant="earnest" />
                <SplitCard icon="◇" label="Penalty Pre-Commit" pct={parsedPenalty.percent} amt={escrow.success?.commissionMicro ?? preview.commissionMicro} note="Routed at deposit" value={penaltyPercent} onChange={setPenaltyPercent} variant="commission" />
                <div className="split-liquid">
                  <span className="split-liquid__label">Liquid</span>
                  <strong>{formatUsdcx(escrow.success?.liquidMicro ?? preview.liquidMicro)}</strong>
                  <span>{formatPercent(liquidPercent)}</span>
                </div>
              </div>
            </div>
            <div className="escrow-cta__actions">
              <div className="escrow-cta__steps">
                <span className={`escrow-step ${escrow.step === "strategy" ? "escrow-step--active" : ""}`}>Set Rules</span>
                <span className={`escrow-step ${escrow.step === "confirming" ? "escrow-step--active" : ""}`}>Confirm</span>
                <span className={`escrow-step ${escrow.step === "deposit" ? "escrow-step--active" : ""}`}>Deposit</span>
                <span className={`escrow-step ${escrow.success ? "escrow-step--active" : ""}`}>Locked</span>
              </div>
              <button className="btn-accent" type="submit" disabled={escrow.isSubmitting}>
                {escrow.isSubmitting ? "Processing..." : "Stake Goal"}
              </button>
            </div>
            {(validationError || escrow.error) && (
              <div className="status-panel error" style={{ marginTop: 16 }}>{validationError ?? escrow.error}</div>
            )}
            {pendingMsg && <div className="status-panel pending" style={{ marginTop: 16 }}>{pendingMsg}</div>}
            {escrow.success && (
              <>
                <div className="status-panel success" style={{ marginTop: 16 }}>
                  <strong>Goal staked on FlowVault</strong>
                  <span>Unlocks at block {escrow.success.lockUntilBlock}</span>
                </div>
                <div className="tx-links" style={{ marginTop: 12 }}>
                  {[{ label: "Strategy", txId: escrow.success.strategyTxId }, { label: "Deposit", txId: escrow.success.depositTxId }].map(({ label, txId }) =>
                    canLinkTx(txId) ? (
                      <a key={txId} href={getHiroTxUrl(txId)} target="_blank" rel="noreferrer">{label}: {shortTx(txId)}</a>
                    ) : (<span key={txId}>{label}: {txId}</span>)
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

function SplitCard({ icon, label, pct, amt, note, value, onChange, variant }: {
  icon: string; label: string; pct: number; amt: bigint; note: string; value: string; onChange: (v: string) => void; variant: "earnest" | "commission";
}) {
  return (
    <div className={`split-card split-card--${variant}`}>
      <div className="split-card__head">
        <span className="split-card__icon">{icon}</span>
        <span className="split-card__label">{label}</span>
        <span className="split-card__pct">{pct || 0}%</span>
      </div>
      <input className="split-card__input" type="number" min="0" max="100" value={value} onChange={(e) => onChange(e.target.value)} />
      <input className="split-card__range" type="range" min="0" max="100" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="split-card__amt"><strong>{formatUsdcx(amt)}</strong><span>{note}</span></div>
    </div>
  );
}
