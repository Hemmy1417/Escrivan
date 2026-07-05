"use client";

import Link from "next/link";
import { Landmark, PlusCircle, Loader2, Inbox } from "lucide-react";
import { useGrantsAwarded, useGrantsReceived } from "@/lib/hooks/useEscrivan";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils";
import { AddressDisplay } from "@/components/AddressDisplay";
import { HowTo } from "@/components/HowTo";
import type { Grant } from "@/lib/contracts/types";

const STATUS_CHIP: Record<string, string> = {
  ACTIVE:           "chip chip-active",
  COMPLETED:        "chip chip-completed",
  CLAWED_BACK:      "chip chip-clawed",
  CLOSED_BY_FUNDER: "chip chip-closed",
};

export default function GrantsPage() {
  const { isConnected } = useWallet();
  const awarded = useGrantsAwarded();
  const received = useGrantsReceived();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-1">Register extract</div>
          <h1 className="display text-4xl">Grants of record</h1>
        </div>
        <Link href="/grants/new" className="btn btn-gold">
          <PlusCircle className="w-4 h-4" />
          Award grant
        </Link>
      </div>

      <HowTo
        id="grants-list"
        reference="ES-02"
        title="Interpretation of grant status"
        clauseLabel="Status"
        items={[
          { label: "ACTIVE",           body: "The obligation schedule is in progress. The grantee may report against the next unmet obligation; the funder may close early." },
          { label: "COMPLETED",        body: "Every obligation was approved and every tranche released. The entry is closed in good standing." },
          { label: "CLAWED_BACK",      body: "Three consecutive rejected reports closed the grant automatically; unreleased escrow was returned to the funder." },
          { label: "CLOSED_BY_FUNDER", body: "The funder exercised early closure. The grantee retains released tranches; the remainder was refunded." },
        ]}
      />

      {!isConnected ? (
        <div className="card p-10 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-muted" />
          <p className="text-ivory-soft/60">Connect a wallet to see grants you fund or receive.</p>
        </div>
      ) : (
        <>
          <GrantSection
            title="As funder"
            hint="Grants you awarded — your escrow at work"
            query={awarded}
            role="funder"
          />
          <GrantSection
            title="As grantee"
            hint="Grants awarded to you — report to earn tranches"
            query={received}
            role="grantee"
          />
        </>
      )}
    </div>
  );
}

function GrantSection({
  title, hint, query, role,
}: {
  title: string;
  hint: string;
  query: { data?: Grant[]; isLoading: boolean };
  role: "funder" | "grantee";
}) {
  const grants = query.data ?? [];
  return (
    <section className="space-y-3">
      <div>
        <h2 className="display text-xl">{title}</h2>
        <p className="text-xs text-ivory-soft/50">{hint}</p>
      </div>
      {query.isLoading ? (
        <div className="card p-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--gold-bright)" }} />
        </div>
      ) : grants.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ivory-soft/50">
          No grants on record {role === "funder" ? "as funder" : "as grantee"}.
        </div>
      ) : (
        <div className="space-y-3">
          {grants.map((g) => (
            <Link
              key={g.grant_id}
              href={`/grants/${g.grant_id}`}
              className="card p-5 flex items-center gap-4 flex-wrap hover:border-gold transition-colors block"
            >
              <span
                className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                style={{ background: "#fff1f6", border: "1px solid var(--hairline)" }}
              >
                <Landmark className="w-4 h-4" style={{ color: "var(--gold-bright)" }} />
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium text-ivory truncate">{g.title}</div>
                <div className="text-xs text-ivory-soft/50 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="mono">#{g.grant_id}</span>
                  <span>·</span>
                  <span>
                    {role === "funder" ? "to " : "from "}
                    <AddressDisplay address={role === "funder" ? g.grantee : g.funder} />
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="mono text-sm" style={{ color: "var(--gold-bright)" }}>
                  {formatGen(g.total_wei)} GEN
                </div>
                <div className="text-[11px] text-ivory-soft/50">
                  {g.obligations_met}/{g.obligations_total} obligations met
                </div>
              </div>
              <span className={STATUS_CHIP[g.status] ?? "chip chip-closed"}>{g.status.replaceAll("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
