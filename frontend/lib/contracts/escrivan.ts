import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Grant, Report, ProtocolStats, TransactionReceipt } from "./types";
import { CONTRACT_ADDRESS } from "../config";

/**
 * Typed wrapper around the deployed Escrivan contract.
 *
 * Conventions carried over from the sibling apps (learned the hard way):
 * - Every u256 arriving from the contract is coerced to Number or kept as a
 *   decimal string at THIS layer, so no BigInt ever leaks into React Query
 *   keys or arithmetic ("Cannot mix BigInt and other types").
 * - waitAndVerify inspects consensus status + execution_result instead of
 *   trusting waitForTransactionReceipt, which returns even on UNDETERMINED.
 * - Reads are defensive: null/[] on failure rather than throwing, so a
 *   fresh deploy renders empty states instead of error boundaries.
 */
class Escrivan {
  private client: ReturnType<typeof createClient>;
  private address: `0x${string}`;

  constructor(contractAddress: string = CONTRACT_ADDRESS, account?: string | null) {
    this.address = contractAddress as `0x${string}`;
    const config: any = { chain: studionet };
    if (account) config.account = account as `0x${string}`;
    this.client = createClient(config);
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private toObj(raw: any): Record<string, any> {
    if (!raw) return {};
    if (raw instanceof Map) return Object.fromEntries(raw.entries());
    if (typeof raw === "object") return raw;
    return {};
  }

  private async waitAndVerify(txHash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = (await this.client.waitForTransactionReceipt({
      hash: txHash as any,
      status: "ACCEPTED" as any,
      retries: 80,
      interval: 5000,
    })) as any;
    const status = String(receipt?.status ?? "").toUpperCase();
    const lr = receipt?.consensus_data?.leader_receipt;
    const r = Array.isArray(lr) ? lr[0] : lr;
    if (status.includes("UNDETERMINED") || status.includes("CANCELED")) {
      throw new Error("Validators could not reach consensus — try again");
    }
    if (r?.execution_result === "ERROR") {
      const stderr: string = r?.genvm_result?.stderr ?? "";
      const userErr = stderr.match(/UserError: (.+)/)?.[1];
      if (userErr) throw new Error(userErr);
      // A clean gl.vm.UserError revert arrives with EMPTY stderr — the message
      // rides in a rollback "payload" field. Walk the receipt for it.
      const payloads: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (o: any, d = 0) => {
        if (!o || d > 8) return;
        if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
        if (typeof o === "object") {
          if (typeof o.payload === "string" && o.payload && o.payload !== "exit_code 1") payloads.push(o.payload);
          Object.values(o).forEach((v) => walk(v, d + 1));
        }
      };
      walk(receipt);
      const fromPayload = payloads.sort((a, b) => b.length - a.length)[0];
      if (fromPayload) {
        console.error("[Escrivan] contract execution error:", { payloads });
        throw new Error(fromPayload.slice(0, 240));
      }
      const lines = stderr.trim().split("\n").filter((l) => l.trim() && !l.startsWith("  "));
      const last = lines[lines.length - 1] || "";
      console.error("[Escrivan] contract execution error:", stderr);
      throw new Error(last.replace(/^.*?Error: /, "").slice(0, 200) || "Contract execution error");
    }
    return receipt as TransactionReceipt;
  }

  private async safeRead(functionName: string, args: any[] = []): Promise<any> {
    try {
      return await this.client.readContract({
        address: this.address,
        functionName,
        args,
      });
    } catch (err) {
      console.warn(`[Escrivan] safeRead "${functionName}" failed:`, err);
      return null;
    }
  }

  private normalizeGrant(raw: any): Grant {
    const g = this.toObj(raw);
    return {
      ...g,
      grant_id:             String(g.grant_id ?? ""),
      total_wei:            String(g.total_wei ?? "0"),
      tranche_wei:          String(g.tranche_wei ?? "0"),
      escrow_remaining_wei: String(g.escrow_remaining_wei ?? "0"),
      obligations:          Array.isArray(g.obligations) ? g.obligations.map(String) : [],
      obligations_total:    Number(g.obligations_total ?? 0),
      obligations_met:      Number(g.obligations_met ?? 0),
      rejection_streak:     Number(g.rejection_streak ?? 0),
      report_ids:           Array.isArray(g.report_ids) ? g.report_ids.map(String) : [],
    } as Grant;
  }

  private normalizeReport(raw: any): Report {
    const r = this.toObj(raw);
    return {
      ...r,
      report_id:            String(r.report_id ?? ""),
      grant_id:             String(r.grant_id ?? ""),
      obligation_index:     Number(r.obligation_index ?? 0),
      evidence_urls:        Array.isArray(r.evidence_urls) ? r.evidence_urls.map(String) : [],
      ai_confidence:        Number(r.ai_confidence ?? 0),
      ai_red_flags:         Array.isArray(r.ai_red_flags) ? r.ai_red_flags.map(String) : [],
      ai_missing:           Array.isArray(r.ai_missing) ? r.ai_missing.map(String) : [],
      tranche_released_wei: String(r.tranche_released_wei ?? "0"),
    } as Report;
  }

  // ── reads ──────────────────────────────────────────────────────────────

  async getProtocolStats(): Promise<ProtocolStats | null> {
    const raw = await this.safeRead("get_protocol_stats");
    if (!raw) return null;
    const s = this.toObj(raw);
    return {
      ...s,
      min_grant_wei:         String(s.min_grant_wei ?? "0"),
      max_grant_wei:         String(s.max_grant_wei ?? "0"),
      min_obligations:       Number(s.min_obligations ?? 2),
      max_obligations:       Number(s.max_obligations ?? 6),
      clawback_streak:       Number(s.clawback_streak ?? 3),
      total_awarded_wei:     String(s.total_awarded_wei ?? "0"),
      total_disbursed_wei:   String(s.total_disbursed_wei ?? "0"),
      total_clawed_back_wei: String(s.total_clawed_back_wei ?? "0"),
      active_grant_count:    Number(s.active_grant_count ?? 0),
      total_grants:          Number(s.total_grants ?? 0),
      total_reports:         Number(s.total_reports ?? 0),
    } as ProtocolStats;
  }

  async getGrant(grantId: string): Promise<Grant | null> {
    const raw = await this.safeRead("get_grant", [grantId]);
    return raw ? this.normalizeGrant(raw) : null;
  }

  async getReport(reportId: string): Promise<Report | null> {
    const raw = await this.safeRead("get_report", [reportId]);
    return raw ? this.normalizeReport(raw) : null;
  }

  async getReportsByGrant(grantId: string): Promise<Report[]> {
    const raw = await this.safeRead("get_reports_by_grant", [grantId]);
    return Array.isArray(raw) ? raw.map((r) => this.normalizeReport(r)) : [];
  }

  async getGrantsByFunder(funder: string): Promise<Grant[]> {
    const raw = await this.safeRead("get_grants_by_funder", [funder]);
    return Array.isArray(raw) ? raw.map((g) => this.normalizeGrant(g)) : [];
  }

  async getGrantsByGrantee(grantee: string): Promise<Grant[]> {
    const raw = await this.safeRead("get_grants_by_grantee", [grantee]);
    return Array.isArray(raw) ? raw.map((g) => this.normalizeGrant(g)) : [];
  }

  async getLedger(limit = 50): Promise<Report[]> {
    const raw = await this.safeRead("get_ledger", [limit]);
    return Array.isArray(raw) ? raw.map((r) => this.normalizeReport(r)) : [];
  }

  // ── writes ─────────────────────────────────────────────────────────────

  async awardGrant(
    grantee: string,
    title: string,
    obligations: string[],
    totalWei: bigint,
  ): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    const txHash = await this.client.writeContract({
      address: this.address,
      functionName: "award_grant",
      args: [grantee, title, JSON.stringify(obligations)],
      value: totalWei,
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }

  async submitReport(
    grantId: string,
    narrative: string,
    evidenceUrls: string[],
  ): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    const txHash = await this.client.writeContract({
      address: this.address,
      functionName: "submit_report",
      args: [grantId, narrative, evidenceUrls],
      value: BigInt(0),
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }

  async closeGrant(grantId: string): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    const txHash = await this.client.writeContract({
      address: this.address,
      functionName: "close_grant",
      args: [grantId],
      value: BigInt(0),
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }

  /** Grantee posts a bond to trigger a second panel round with their instructions. */
  async appealReport(
    reportId: string,
    instructions: string,
    bondWei: bigint,
  ): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    const txHash = await this.client.writeContract({
      address: this.address,
      functionName: "appeal_report",
      args: [reportId, instructions],
      value: bondWei,
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }

  /** Execute an armed clawback once the appeal window has run its course. */
  async finalizeClawback(grantId: string): Promise<{ receipt: TransactionReceipt; txHash: string }> {
    const txHash = await this.client.writeContract({
      address: this.address,
      functionName: "finalize_clawback",
      args: [grantId],
      value: BigInt(0),
    });
    const receipt = await this.waitAndVerify(txHash);
    return { receipt, txHash: String(txHash) };
  }
}

export default Escrivan;
