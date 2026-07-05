"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Landmark, Plus, X, Info } from "lucide-react";
import { useAwardGrant, useProtocolStats } from "@/lib/hooks/useEscrivan";
import { useWallet } from "@/lib/genlayer/wallet";
import { parseGen, formatGen } from "@/lib/utils";
import { error as toastError } from "@/lib/toast";
import { HowTo } from "@/components/HowTo";

const MIN_OBS = 2;
const MAX_OBS = 6;

export default function NewGrantPage() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const { data: stats } = useProtocolStats();
  const { awardGrant, isAwarding } = useAwardGrant();

  const [grantee, setGrantee] = useState("");
  const [title, setTitle] = useState("");
  const [amountText, setAmountText] = useState("1");
  const [obligations, setObligations] = useState<string[]>(["", ""]);

  const totalWei = useMemo(() => {
    try { return parseGen(amountText); } catch { return BigInt(0); }
  }, [amountText]);

  const filledObs = obligations.map((o) => o.trim()).filter(Boolean);
  const trancheWei = filledObs.length > 0 ? totalWei / BigInt(filledObs.length) : BigInt(0);

  const selfGrant =
    !!address && grantee.trim().toLowerCase() === address.toLowerCase();

  const addObligation = () => {
    if (obligations.length >= MAX_OBS) return;
    setObligations((s) => [...s, ""]);
  };
  const setObligation = (i: number, v: string) =>
    setObligations((s) => s.map((row, idx) => (idx === i ? v : row)));
  const removeObligation = (i: number) =>
    setObligations((s) => (s.length <= MIN_OBS ? s : s.filter((_, idx) => idx !== i)));

  const submit = () => {
    if (!isConnected) return toastError("Connect your wallet");
    const g = grantee.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(g)) return toastError("Grantee must be a full 42-character address");
    if (selfGrant) return toastError("Funder and grantee must differ");
    if (!title.trim()) return toastError("Give the grant a title");
    if (filledObs.length < MIN_OBS) return toastError(`Define at least ${MIN_OBS} obligations`);
    if (totalWei < BigInt("100000000000000000")) return toastError("Minimum grant is 0.1 GEN");
    if (totalWei > BigInt("10000000000000000000")) return toastError("Maximum grant is 10 GEN in the MVP");

    awardGrant(
      { grantee: g, title: title.trim(), obligations: filledObs, totalWei },
      { onSuccess: () => router.push("/grants") },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <div className="eyebrow mb-2">New entry</div>
        <h1 className="display text-4xl mb-3">Award a grant</h1>
        <p className="text-ivory-soft/70">
          The full amount locks in escrow when you sign. It is split into equal
          tranches, one per obligation, released only against approved reviews.
        </p>
      </div>

      <HowTo
        id="award-grant"
        reference="ES-01"
        title="Procedure for entering a grant"
        intro="An award binds on execution of the transfer. The escrow is indivisible from the obligation schedule — funds release tranche by tranche as the panel approves each report, and never otherwise."
        items={[
          { label: "Nomination of the grantee", body: "The full 42-character wallet address that will receive tranches. It must differ from your own — self-grants are refused at the contract." },
          { label: "Statement of obligations", body: "Two to six concrete commitments, each independently reportable. Write them as deliverables the panel can verify against evidence — vague obligations produce vague rulings." },
          { label: "Sum of the award", body: "0.1 to 10 GEN in the MVP. The sum divides equally across obligations; the final tranche absorbs any rounding remainder." },
          { label: "Execution", body: "Signing locks the full sum. Your only recourse afterwards is early closure, which returns unreleased escrow but never touches tranches already earned." },
        ]}
      />

      <div className="card p-6 space-y-5">
        <Field label="Grant title">
          <input
            className="input"
            placeholder="Community Water Project — Phase II"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isAwarding}
          />
        </Field>

        <Field label="Grantee wallet" hint="Full 0x… address. Tranches release directly to this wallet.">
          <input
            className="input mono text-sm"
            placeholder="0x…"
            value={grantee}
            onChange={(e) => setGrantee(e.target.value)}
            disabled={isAwarding}
          />
          {selfGrant && (
            <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>
              This is your own wallet — funder and grantee must differ.
            </p>
          )}
        </Field>

        <Field label="Total award (GEN)" hint={`Bounds: ${formatGen(stats?.min_grant_wei ?? "100000000000000000")} – ${formatGen(stats?.max_grant_wei ?? "10000000000000000000")} GEN`}>
          <input
            className="input mono"
            type="number"
            step="0.1"
            min="0.1"
            max="10"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            disabled={isAwarding}
          />
        </Field>

        <div className="space-y-3">
          <div>
            <div className="eyebrow mb-1.5">Obligations ({filledObs.length} of {MIN_OBS}–{MAX_OBS})</div>
            <p className="text-xs text-ivory-soft/50">
              One tranche per obligation. Make each one independently verifiable.
            </p>
          </div>
          {obligations.map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mono text-xs text-muted pt-3 w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <textarea
                className="input text-sm min-h-[60px] resize-y"
                placeholder={`e.g. "Complete borehole survey across three districts and publish the findings"`}
                value={o}
                onChange={(e) => setObligation(i, e.target.value)}
                disabled={isAwarding}
              />
              {obligations.length > MIN_OBS && (
                <button
                  className="btn btn-ghost mt-1"
                  onClick={() => removeObligation(i)}
                  disabled={isAwarding}
                  aria-label="Remove obligation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {obligations.length < MAX_OBS && (
            <button
              className="btn btn-ghost w-full"
              onClick={addObligation}
              disabled={isAwarding}
              style={{ borderStyle: "dashed" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add obligation
            </button>
          )}
        </div>

        <div className="hairline" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="eyebrow mb-1">Tranche per obligation</div>
            <div className="mono" style={{ color: "var(--gold-bright)" }}>
              {filledObs.length > 0 && totalWei > BigInt(0)
                ? `${formatGen(trancheWei)} GEN`
                : "—"}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1">Locks on signing</div>
            <div className="mono" style={{ color: "var(--gold-bright)" }}>
              {totalWei > BigInt(0) ? `${formatGen(totalWei)} GEN` : "—"}
            </div>
          </div>
        </div>

        {isAwarding && (
          <div className="card-strong p-4 flex items-start gap-3">
            <Loader2 className="w-5 h-5 mt-0.5 animate-spin" style={{ color: "var(--gold-bright)" }} />
            <div className="text-sm">
              <div className="font-medium">Entering the grant in the register</div>
              <div className="text-xs text-ivory-soft/60 mt-1">
                Escrow locks when validators finalize — under a minute.
              </div>
            </div>
          </div>
        )}

        <button className="btn btn-gold w-full" onClick={submit} disabled={isAwarding || !isConnected}>
          {isAwarding ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Locking escrow…</>
          ) : (
            <><Landmark className="w-4 h-4" /> Award grant</>
          )}
        </button>

        {!isConnected && (
          <p className="text-center text-xs text-ivory-soft/50 flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Connect your wallet to award a grant.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block eyebrow mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-ivory-soft/50 mt-1.5">{hint}</p>}
    </div>
  );
}
