"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, BookOpenCheck } from "lucide-react";
import { useLedger } from "@/lib/hooks/useEscrivan";
import { formatGen } from "@/lib/utils";
import { AddressDisplay } from "@/components/AddressDisplay";
import { HowTo } from "@/components/HowTo";

export default function LedgerPage() {
  const { data: reports, isLoading } = useLedger(50);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Public register</div>
        <h1 className="display text-4xl mb-3">The ledger</h1>
        <p className="text-ivory-soft/70 max-w-2xl">
          Every ruling the panel has ever issued, in order, unredacted. The
          register exists so that any party — funder, grantee, or bystander —
          may audit the panel's conduct.
        </p>
      </div>

      <HowTo
        id="ledger"
        reference="ES-04"
        title="Reading the register"
        clauseLabel="Column"
        items={[
          { label: "Verdict",  body: "APPROVED entries released their tranche on the same transaction. REJECTED entries held it and count toward the clawback streak." },
          { label: "Dimensions", body: "Each ruling carries four qualitative findings — progress, evidence, spending, impact — visible in the full adjudication file." },
          { label: "Released", body: "The GEN actually transferred to the grantee. Zero on rejections, which are nonetheless preserved so the reasoning remains a matter of record." },
          { label: "Drill in", body: "Selecting any entry opens the complete file — the obligation, the narrative, the cited evidence, and the panel's reasoning paragraph." },
        ]}
      />

      {isLoading ? (
        <div className="card p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-bright)" }} />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpenCheck className="w-10 h-10 mx-auto mb-3 text-muted" />
          <p className="text-ivory-soft/60">No rulings on record yet.</p>
          <p className="text-xs text-muted mt-1">The register fills as reports are filed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const approved = r.overall === "APPROVED";
            return (
              <Link
                key={r.report_id}
                href={`/reports/${r.report_id}`}
                className="card p-5 flex items-center gap-4 flex-wrap hover:border-gold transition-colors block"
              >
                {approved ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" style={{ color: "var(--danger)" }} />
                )}
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-ivory">
                    <span className="mono text-ivory-soft/50">#{r.report_id}</span>
                    {" · Grant "}
                    <span className="mono">{r.grant_id}</span>
                    {" · Obligation "}
                    <span className="mono">{String(r.obligation_index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="text-xs text-ivory-soft/50 mt-0.5 truncate max-w-md">
                    {r.ai_summary || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`chip ${approved ? "chip-approved" : "chip-rejected"}`}>
                    {r.overall}
                  </span>
                  {approved && (
                    <div className="mono text-xs mt-1" style={{ color: "var(--success)" }}>
                      {formatGen(r.tranche_released_wei)} GEN
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-muted">
                  <AddressDisplay address={r.grantee} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
