"use client";

import { Loader2, Landmark, Coins, Undo2, ScrollText } from "lucide-react";
import { useProtocolStats } from "@/lib/hooks/useEscrivan";
import { formatGen } from "@/lib/utils";
import { HowTo } from "@/components/HowTo";

export default function RecordsPage() {
  const { data: stats, isLoading } = useProtocolStats();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Protocol accounts</div>
        <h1 className="display text-4xl">Records</h1>
      </div>

      <HowTo
        id="records"
        reference="ES-05"
        title="Constitution of the escrow"
        intro="Escrivan holds no pooled capital. Each grant is its own escrow, locked in full at award and released only through the obligation schedule — there is no protocol owner and no withdrawal path outside the rules below."
        items={[
          { label: "Awarded",     body: "The lifetime total locked by funders at the moment of award. Nothing enters escrow except through award_grant, and never partially." },
          { label: "Disbursed",   body: "The lifetime total released to grantees against approved rulings. Each release is bound to a specific report in the public ledger." },
          { label: "Clawed back", body: "The lifetime total returned to funders — through the three-rejection automatic closure or a funder's early closure. Earned tranches are never clawed back." },
          { label: "Bounds",      body: "Awards run 0.1 to 10 GEN across 2 to 6 obligations in the MVP. The final tranche absorbs integer-division dust so every wei is accounted for." },
        ]}
      />

      {isLoading || !stats ? (
        <div className="card p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-bright)" }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <BigStat icon={Landmark}   label="Awarded"     value={`${formatGen(stats.total_awarded_wei)} GEN`}     hint="Locked lifetime" />
            <BigStat icon={Coins}      label="Disbursed"   value={`${formatGen(stats.total_disbursed_wei)} GEN`}   hint="Released on approvals" />
            <BigStat icon={Undo2}      label="Clawed back" value={`${formatGen(stats.total_clawed_back_wei)} GEN`} hint="Returned to funders" />
            <BigStat icon={ScrollText} label="Rulings"     value={String(stats.total_reports)}                     hint={`${stats.total_grants} grants entered`} />
          </div>

          <div className="card p-6 space-y-4">
            <div className="eyebrow">Standing parameters</div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ivory-soft/50">Award minimum</dt>
              <dd className="mono">{formatGen(stats.min_grant_wei)} GEN</dd>
              <dt className="text-ivory-soft/50">Award maximum</dt>
              <dd className="mono">{formatGen(stats.max_grant_wei)} GEN</dd>
              <dt className="text-ivory-soft/50">Obligations per grant</dt>
              <dd className="mono">{stats.min_obligations}–{stats.max_obligations}</dd>
              <dt className="text-ivory-soft/50">Clawback threshold</dt>
              <dd className="mono">{stats.clawback_streak} consecutive rejections</dd>
              <dt className="text-ivory-soft/50">Active grants</dt>
              <dd className="mono">{stats.active_grant_count}</dd>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}

function BigStat({
  icon: Icon, label, value, hint,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string; hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="eyebrow">{label}</span>
        <Icon className="w-4 h-4" style={{ color: "var(--muted)" }} />
      </div>
      <div className="display text-2xl leading-none mb-1">{value}</div>
      {hint && <div className="text-xs text-ivory-soft/50">{hint}</div>}
    </div>
  );
}
