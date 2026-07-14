"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, ScrollText, CheckCircle2, XCircle, Circle, Undo2, AlertCircle, Scale } from "lucide-react";
import { useGrant, useReportsByGrant, useCloseGrant, useAppealReport, useFinalizeClawback } from "@/lib/hooks/useEscrivan";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils";
import { AddressDisplay } from "@/components/AddressDisplay";
import type { Report } from "@/lib/contracts/types";

const APPEAL_BOND_BPS = 100;                 // 1% of the tranche
const MIN_APPEAL_BOND = BigInt(10) ** BigInt(16);   // 0.01 GEN

export default function GrantDetailPage() {
  const params = useParams<{ id: string }>();
  const grantId = params.id;
  const { address, isConnected } = useWallet();
  const { data: grant, isLoading } = useGrant(grantId);
  const { data: reports } = useReportsByGrant(grantId);
  const { closeGrant, isClosing } = useCloseGrant();
  const { appealReport, isAppealing } = useAppealReport();
  const { finalizeClawback, isFinalizing } = useFinalizeClawback();
  const [appealNote, setAppealNote] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-bright)" }} />
      </div>
    );
  }
  if (!grant) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="display text-2xl mb-2">Grant not found</h1>
        <Link href="/grants" className="btn btn-ghost mt-4">Back to grants</Link>
      </div>
    );
  }

  const isFunder  = !!address && grant.funder.toLowerCase() === address.toLowerCase();
  const isGrantee = !!address && grant.grantee.toLowerCase() === address.toLowerCase();
  const active = grant.status === "ACTIVE";
  const clawbackPending = grant.status === "CLAWBACK_PENDING";
  const reportByObligation = new Map<number, Report[]>();
  for (const r of reports ?? []) {
    const arr = reportByObligation.get(r.obligation_index) ?? [];
    arr.push(r);
    reportByObligation.set(r.obligation_index, arr);
  }

  // the appeal target: the grant's latest report, if REJECTED and unappealed
  const lastId = grant.report_ids?.[grant.report_ids.length - 1];
  const lastReport = (reports ?? []).find((r) => r.report_id === lastId);
  const appealable = !!lastReport && lastReport.overall === "REJECTED" && !lastReport.appealed
    && (active || clawbackPending);
  const bondWei = (() => {
    const pct = (BigInt(grant.tranche_wei || "0") * BigInt(APPEAL_BOND_BPS)) / BigInt(10000);
    return pct > MIN_APPEAL_BOND ? pct : MIN_APPEAL_BOND;
  })();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Grant #{grant.grant_id}</div>
        <h1 className="display text-4xl mb-3">{grant.title}</h1>
        <div className="flex items-center gap-3 flex-wrap text-sm text-ivory-soft/60">
          <span>Funder <AddressDisplay address={grant.funder} showCopy /></span>
          <span>·</span>
          <span>Grantee <AddressDisplay address={grant.grantee} showCopy /></span>
          <span className={`chip ${
            grant.status === "ACTIVE" ? "chip-active" :
            grant.status === "COMPLETED" ? "chip-completed" :
            grant.status === "CLAWBACK_PENDING" ? "chip-pending" :
            grant.status === "CLAWED_BACK" ? "chip-clawed" : "chip-closed"
          }`}>
            {grant.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      {/* Escrow strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total award"    value={`${formatGen(grant.total_wei)} GEN`} />
        <Stat label="In escrow"      value={`${formatGen(grant.escrow_remaining_wei)} GEN`} />
        <Stat label="Tranche"        value={`${formatGen(grant.tranche_wei)} GEN`} />
      </div>

      {active && grant.rejection_streak > 0 && (
        <div
          className="p-3 rounded-sm flex items-start gap-2 text-sm"
          style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.35)" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
          <span>
            {grant.rejection_streak} consecutive rejection{grant.rejection_streak > 1 ? "s" : ""} on
            record. At 3 a clawback arms; the remaining escrow returns to the funder unless a
            bonded appeal overturns the ruling first.
          </span>
        </div>
      )}

      {/* Armed clawback: the appeal window before the money moves */}
      {clawbackPending && (
        <div
          className="p-4 rounded-sm flex items-start gap-3 text-sm"
          style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.45)" }}
        >
          <Undo2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
          <div className="flex-1">
            <p className="mb-1" style={{ color: "var(--danger)" }}>
              Clawback armed — three consecutive rejections.
            </p>
            <p className="text-ivory-soft/70">
              The escrow does not move yet: the grantee can post a bonded appeal below. The
              funder can execute the clawback once the appeal window elapses (or an appeal is
              upheld).
            </p>
            {isFunder && (
              <button
                className="btn btn-danger mt-3"
                disabled={isFinalizing}
                onClick={() => finalizeClawback(grant.grant_id)}
              >
                {isFinalizing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Executing…</>
                  : `Finalize clawback · reclaim ${formatGen(grant.escrow_remaining_wei)} GEN`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bonded appeal: second panel round with the grantee's instructions */}
      {appealable && isGrantee && (
        <section className="card-strong p-5 flex items-start gap-4">
          <Scale className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--gold-bright)" }} />
          <div className="flex-1">
            <h3 className="display text-lg mb-1">Appeal the last ruling</h3>
            <p className="text-sm text-ivory-soft/65 mb-3">
              Report #{lastReport!.report_id} was rejected. Post a{" "}
              <span className="mono" style={{ color: "var(--gold-bright)" }}>{formatGen(bondWei.toString())} GEN</span>{" "}
              bond to trigger a second panel round over the same evidence, with your
              instructions in front of the panel. A flipped ruling releases the tranche and
              returns your bond; an upheld ruling forfeits the bond to the funder. One appeal
              per report.
            </p>
            <textarea
              className="input w-full text-sm"
              rows={3}
              maxLength={1500}
              placeholder="Tell the panel what the first round misread — point it at the exact evidence…"
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
            />
            <button
              className="btn btn-gold mt-3"
              disabled={isAppealing || appealNote.trim().length < 20}
              onClick={() => appealReport({ reportId: lastReport!.report_id, instructions: appealNote.trim(), bondWei })}
            >
              {isAppealing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Second round running…</>
                : `Appeal · bond ${formatGen(bondWei.toString())} GEN`}
            </button>
          </div>
        </section>
      )}

      {/* Obligation thread */}
      <section className="space-y-3">
        <div className="eyebrow">Obligation thread</div>
        {grant.obligations.map((text, i) => {
          const met = i < grant.obligations_met;
          const isNext = i === grant.obligations_met && active;
          const obligationReports = reportByObligation.get(i) ?? [];
          return (
            <div
              key={i}
              className="card p-5"
              style={isNext ? { borderColor: "rgba(255, 77, 139, 0.45)" } : undefined}
            >
              <div className="flex items-start gap-3">
                {met ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                ) : isNext ? (
                  <Circle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--gold-bright)" }} />
                ) : (
                  <Circle className="w-5 h-5 mt-0.5 shrink-0 text-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="mono text-xs text-muted">
                      Obligation {String(i + 1).padStart(2, "0")}
                    </span>
                    {met && <span className="chip chip-approved">Met · tranche released</span>}
                    {isNext && <span className="chip chip-pending">Awaiting report</span>}
                  </div>
                  <p className="text-sm text-ivory mt-1.5 leading-relaxed">{text}</p>

                  {obligationReports.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {obligationReports.map((r) => (
                        <Link
                          key={r.report_id}
                          href={`/reports/${r.report_id}`}
                          className="flex items-center gap-2 text-xs hover:underline"
                          style={{ color: r.overall === "APPROVED" ? "var(--success)" : "var(--danger)" }}
                        >
                          {r.overall === "APPROVED"
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />}
                          Report #{r.report_id} — {r.overall}
                          {r.appealed && ` · ${r.appeal_outcome === "FLIPPED" ? "flipped on appeal" : "appeal upheld"}`}
                          {r.overall === "APPROVED" && ` · ${formatGen(r.tranche_released_wei)} GEN released`}
                        </Link>
                      ))}
                    </div>
                  )}

                  {isNext && isGrantee && (
                    <Link href={`/reports/new/${grant.grant_id}`} className="btn btn-gold mt-3">
                      <ScrollText className="w-4 h-4" />
                      File report
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Funder controls */}
      {isFunder && active && (
        <section className="card-strong p-5 flex items-start gap-4">
          <Undo2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
          <div className="flex-1">
            <h3 className="display text-lg mb-1">Early closure</h3>
            <p className="text-sm text-ivory-soft/65 mb-3">
              Returns the remaining {formatGen(grant.escrow_remaining_wei)} GEN to your wallet.
              The grantee keeps every tranche already earned. Irreversible.
            </p>
            <button
              className="btn btn-danger"
              disabled={isClosing}
              onClick={() => {
                if (confirm(`Close grant #${grant.grant_id} and reclaim ${formatGen(grant.escrow_remaining_wei)} GEN?`)) {
                  closeGrant(grant.grant_id);
                }
              }}
            >
              {isClosing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Closing…</>
              ) : (
                "Close grant"
              )}
            </button>
          </div>
        </section>
      )}

      {!isConnected && (
        <p className="text-center text-xs text-ivory-soft/50">
          Connect a wallet to act on this grant.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className="mono text-sm" style={{ color: "var(--gold-bright)" }}>{value}</div>
    </div>
  );
}
