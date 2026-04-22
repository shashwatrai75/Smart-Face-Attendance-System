import PropTypes from 'prop-types';

const FaceScanOverlay = ({ statusText = 'Initializing Face Recognition...' }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center face-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Face recognition loading"
    >
      {/* Background */}
      <div className="absolute inset-0 face-bg" />
      <div className="absolute inset-0 face-bg-noise opacity-60" />
      <div className="absolute inset-0 face-vignette" />

      <div className="relative w-full max-w-2xl px-6">
        <div className="mx-auto flex flex-col items-center">
          <div className="relative">
            {/* Ambient glow */}
            <div className="absolute -inset-20 rounded-[3.5rem] bg-cyan-400/10 blur-3xl" />
            <div className="absolute -inset-28 rounded-[4rem] bg-fuchsia-500/10 blur-[70px]" />

            {/* Face mesh frame — larger for clearer alignment cue */}
            <div className="relative aspect-[3/4] w-[min(88vw,22rem)] sm:w-[min(88vw,26rem)] md:w-[min(88vw,30rem)] overflow-hidden rounded-[2.25rem] border border-cyan-200/25 bg-slate-950/35 shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_0_55px_rgba(99,102,241,0.18)] face-global-pulse">
              {/* Glowing grid overlay */}
              <div className="absolute inset-0 face-scan-grid opacity-55" />

              {/* Wireframe face scan art */}
              <div className="absolute inset-0 face-photo-pulse">
                <img
                  src={`${import.meta.env.BASE_URL}face-scan-wireframe.png`}
                  alt=""
                  className="h-full w-full object-contain p-4 scale-[1.02] opacity-[0.98] saturate-[1.05] contrast-[1.08] face-photo-mask"
                  draggable={false}
                />
              </div>

              {/* AI overlay tint + mesh (subtle so wireframe stays visible) */}
              <div className="absolute inset-0 face-ai-overlay opacity-60" />
              <div className="absolute inset-0 face-mesh-overlay opacity-40" />

              {/* Landmarks */}
              <div className="pointer-events-none absolute inset-0">
                {[
                  { x: 44, y: 40 }, // left brow
                  { x: 56, y: 40 }, // right brow
                  { x: 41, y: 48 }, // left eye
                  { x: 59, y: 48 }, // right eye
                  { x: 50, y: 55 }, // nose bridge
                  { x: 50, y: 63 }, // nose tip
                  { x: 45, y: 70 }, // left mouth
                  { x: 55, y: 70 }, // right mouth
                  { x: 50, y: 72 }, // center mouth
                  { x: 38, y: 58 }, // left cheek
                  { x: 62, y: 58 }, // right cheek
                ].map((p) => (
                  <span
                    key={`${p.x}-${p.y}`}
                    className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/80 shadow-[0_0_10px_rgba(34,211,238,0.55)]"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  />
                ))}
              </div>

              {/* Radar pulse */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="face-radar h-24 w-24 rounded-full border border-cyan-300/25 bg-cyan-300/5" />
                <div className="face-radar-delayed absolute h-44 w-44 rounded-full border border-indigo-300/15 bg-transparent" />
              </div>

              {/* Scanning line */}
              <div className="face-scanline absolute left-0 right-0 top-0 h-16" />

              {/* Frame accents */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-6 top-6 h-9 w-9 border-l-2 border-t-2 border-cyan-300/60" />
                <div className="absolute right-6 top-6 h-9 w-9 border-r-2 border-t-2 border-cyan-300/60" />
                <div className="absolute left-6 bottom-6 h-9 w-9 border-b-2 border-l-2 border-cyan-300/60" />
                <div className="absolute right-6 bottom-6 h-9 w-9 border-b-2 border-r-2 border-cyan-300/60" />
              </div>
            </div>
          </div>

          <div className="mt-7 text-center">
            <p className="text-sm font-semibold tracking-wide text-cyan-50/95">
              {statusText}
            </p>
            <p className="mt-2 text-xs text-slate-200/55">
              Align your face inside the frame; when the camera opens, tap Capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

FaceScanOverlay.propTypes = {
  statusText: PropTypes.string,
};

export default FaceScanOverlay;

