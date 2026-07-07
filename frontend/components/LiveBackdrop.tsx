"use client";

// Escrivan — Clay-inspired organic backdrop on a cream canvas.
// Soft saturated blobs (pink / lavender / peach / ochre / teal) drift and
// morph like claymation shapes, with a faint warm grain. Everything sits
// far behind content at low opacity so ink text stays perfectly readable.
// GPU-friendly (transform/border-radius/opacity), reduced-motion aware.

export function LiveBackdrop() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="cl-wash" />

      <span className="cl-blob cl-b1" />
      <span className="cl-blob cl-b2" />
      <span className="cl-blob cl-b3" />
      <span className="cl-blob cl-b4" />
      <span className="cl-blob cl-b5" />

      <div className="cl-grain" />

      <style jsx>{`
        .cl-wash {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 15% 0%,
              rgba(255, 176, 132, 0.14) 0%, transparent 60%),
            radial-gradient(ellipse 60% 45% at 95% 15%,
              rgba(184, 164, 237, 0.13) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 50% 105%,
              rgba(232, 185, 74, 0.10) 0%, transparent 55%),
            #fffaf0;
        }

        .cl-blob {
          position: absolute;
          filter: blur(60px);
          opacity: 0.32;
          will-change: transform, border-radius;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        /* Organic morph — border-radius keyframes give the claymation feel */
        @keyframes clMorphA {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1);
                     border-radius: 58% 42% 55% 45% / 48% 60% 40% 52%; }
          33%       { transform: translate(60px, 30px) rotate(8deg) scale(1.08);
                     border-radius: 45% 55% 40% 60% / 60% 42% 58% 40%; }
          66%       { transform: translate(-40px, 60px) rotate(-6deg) scale(0.96);
                     border-radius: 52% 48% 62% 38% / 42% 55% 45% 58%; }
        }
        @keyframes clMorphB {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1);
                     border-radius: 45% 55% 48% 52% / 55% 45% 58% 42%; }
          50%       { transform: translate(-70px, -40px) rotate(10deg) scale(1.1);
                     border-radius: 60% 40% 52% 48% / 44% 60% 40% 56%; }
        }

        .cl-b1 {
          width: 520px; height: 480px;
          top: -140px; left: -120px;
          background: #ffb084;                 /* peach */
          animation-name: clMorphA; animation-duration: 34s;
        }
        .cl-b2 {
          width: 460px; height: 440px;
          top: 5%; right: -140px;
          background: #b8a4ed;                 /* lavender */
          animation-name: clMorphB; animation-duration: 40s;
        }
        .cl-b3 {
          width: 420px; height: 400px;
          bottom: -120px; left: 12%;
          background: #e8b94a;                 /* ochre */
          opacity: 0.22;
          animation-name: clMorphA; animation-duration: 46s; animation-delay: -12s;
        }
        .cl-b4 {
          width: 380px; height: 360px;
          bottom: 8%; right: 8%;
          background: #ff4d8b;                 /* pink */
          opacity: 0.14;
          animation-name: clMorphB; animation-duration: 38s; animation-delay: -20s;
        }
        .cl-b5 {
          width: 300px; height: 300px;
          top: 40%; left: 42%;
          background: #a4d4c5;                 /* mint */
          opacity: 0.18;
          animation-name: clMorphA; animation-duration: 50s; animation-delay: -6s;
        }

        .cl-grain {
          position: absolute; inset: 0;
          opacity: 0.55;
          mix-blend-mode: multiply;
          background-image:
            radial-gradient(rgba(10, 10, 10, 0.015) 1px, transparent 1px),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.60 0 0 0 0 0.53 0 0 0 0 0.38 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 4px 4px, 160px 160px;
        }

        @media (prefers-reduced-motion: reduce) {
          .cl-blob { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
