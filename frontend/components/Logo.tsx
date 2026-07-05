export function EscrivanWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.35 : 1;
  return (
    <div className="flex items-center gap-2.5" style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
      <EscrivanMark />
      <span className="display text-[1.35rem] tracking-[0.14em] font-medium text-ivory">
        ESCRIVAN
      </span>
    </div>
  );
}

export function EscrivanMark({ size = 26 }: { size?: number }) {
  // A quill nib over an open ledger — the scribe of record.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Open ledger base */}
      <path
        d="M6 28 C11 25.5 16 25.5 20 27.5 C24 25.5 29 25.5 34 28 V33 C29 30.5 24 30.5 20 32.5 C16 30.5 11 30.5 6 33 Z"
        stroke="#0a0a0a"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="#fff1f6"
      />
      {/* Ledger spine */}
      <line x1="20" y1="27.5" x2="20" y2="32.5" stroke="#0a0a0a" strokeWidth="1.2" />
      {/* Quill shaft */}
      <path
        d="M28 6 C24 10 19 16 17 22 L15.5 25.5 L19 24 C25 21 29 15 31 9 Z"
        stroke="#ff4d8b"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="rgba(180, 122, 10, 0.08)"
      />
      {/* Nib slit */}
      <line x1="16.5" y1="24.5" x2="21" y2="18" stroke="#ff4d8b" strokeWidth="1" />
    </svg>
  );
}
