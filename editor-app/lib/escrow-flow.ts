import { FLOWVAULT_API_BASE } from "@/lib/config";

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
  const normalized = normalizeTxId(txId);

  while (Date.now() < deadline) {
    const response = await fetchImpl(
      `${FLOWVAULT_API_BASE}/extended/v1/tx/${normalized}`
    );

    if (response.status === 404) {
      await wait(pollIntervalMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Tx check failed: ${response.status} for ${normalized}`);
    }

    const payload = (await response.json()) as { tx_status?: string };
    const status = payload.tx_status;

    if (status === "success") return;

    if (status && status !== "pending") {
      throw new Error(`Tx ${normalized} failed: ${status}`);
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`Timeout waiting for tx ${normalized}`);
}
