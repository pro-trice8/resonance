// BeanBuddy — an original expressive companion character.
// Drop this component into page.js (or import it). Renders a big bean creature
// that animates based on the `mood` prop: happy dances, sad cries, angry fumes, etc.
"use client";
import { useEffect, useState } from "react";

const MOOD_THEME = {
  happy:   { body: "#e0a838", accent: "#f2c96a", label: "dancing" },
  sad:     { body: "#6b93c9", accent: "#9fc0e6", label: "crying" },
  angry:   { body: "#e0654a", accent: "#ff8a6a", label: "fuming" },
  fear:    { body: "#b183d6", accent: "#d0b0ee", label: "trembling" },
  disgust: { body: "#8bb56a", accent: "#aed48c", label: "queasy" },
  neutral: { body: "#c9a888", accent: "#e0c4a4", label: "resting" },
};

export default function BeanBuddy({ mood = "neutral", size = 150 }) {
  const t = MOOD_THEME[mood] || MOOD_THEME.neutral;
  const [tears, setTears] = useState([]);

  // spawn falling tears when sad
  useEffect(() => {
    if (mood !== "sad") { setTears([]); return; }
    const id = setInterval(() => {
      setTears((prev) => [...prev.slice(-6), { id: Date.now() + Math.random(), side: Math.random() > 0.5 ? 1 : -1 }]);
    }, 500);
    return () => clearInterval(id);
  }, [mood]);

  const eyeShape = {
    happy:   "M -4 0 Q 0 -5 4 0",     // ^ ^ happy arcs
    sad:     "M -4 -2 Q 0 2 4 -2",    // droopy
    angry:   "M -5 -3 L 4 1",         // angry slant
    fear:    null,                     // wide circles (default)
    disgust: "M -4 0 L 4 -1",
    neutral: null,
  }[mood];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, userSelect: "none" }}>
      <div className={"buddy buddy-" + mood} style={{ position: "relative", width: size, height: size }}>
        {/* angry steam puffs */}
        {mood === "angry" && (
          <>
            <span className="puff" style={{ left: "16%", top: "6%" }} />
            <span className="puff" style={{ right: "16%", top: "6%", animationDelay: "0.4s" }} />
          </>
        )}
        {/* falling tears */}
        {mood === "sad" && tears.map((tr) => (
          <span key={tr.id} className="tear" style={{ left: `calc(50% + ${tr.side * size * 0.16}px)`, top: size * 0.42 }} />
        ))}

        <svg viewBox="0 0 120 130" width={size} height={size} style={{ overflow: "visible" }}>
          {/* shadow */}
          <ellipse cx="60" cy="122" rx="34" ry="6" fill="rgba(0,0,0,0.25)" className="buddy-shadow" />
          {/* little feet */}
          <ellipse cx="44" cy="116" rx="9" ry="6" fill={t.body} className="foot foot-l" />
          <ellipse cx="76" cy="116" rx="9" ry="6" fill={t.body} className="foot foot-r" />
          {/* body: coffee bean */}
          <g className="buddy-body">
            <ellipse cx="60" cy="66" rx="42" ry="50" fill={t.body} />
            <ellipse cx="60" cy="66" rx="42" ry="50" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            {/* bean crease */}
            <path d="M 60 20 Q 74 66 60 112" stroke="rgba(0,0,0,0.18)" strokeWidth="3" fill="none" />
            {/* arms */}
            <path className="arm arm-l" d="M 20 66 Q 6 72 8 88" stroke={t.body} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path className="arm arm-r" d="M 100 66 Q 114 72 112 88" stroke={t.body} strokeWidth="9" strokeLinecap="round" fill="none" />
            {/* face highlight */}
            <ellipse cx="46" cy="44" rx="10" ry="14" fill={t.accent} opacity="0.35" />
            {/* eyes */}
            {eyeShape ? (
              <>
                <path d={"M 44 58 " + eyeShape.replace(/-?\d+/g, (n) => (+n + 44))} transform="translate(0,0)" fill="none" stroke="#241812" strokeWidth="3" strokeLinecap="round" />
                <path d={"M 76 58 " + eyeShape} fill="none" stroke="#241812" strokeWidth="3" strokeLinecap="round" transform="translate(32,0)" />
              </>
            ) : (
              <>
                <circle cx="46" cy="60" r={mood === "fear" ? 7 : 5} fill="#241812" className="eye" />
                <circle cx="74" cy="60" r={mood === "fear" ? 7 : 5} fill="#241812" className="eye" />
                <circle cx="44" cy="58" r="1.6" fill="#fff" />
                <circle cx="72" cy="58" r="1.6" fill="#fff" />
              </>
            )}
            {/* blush when happy */}
            {mood === "happy" && (<>
              <circle cx="38" cy="72" r="6" fill="#ff9a5a" opacity="0.5" />
              <circle cx="82" cy="72" r="6" fill="#ff9a5a" opacity="0.5" />
            </>)}
            {/* angry brow */}
            {mood === "angry" && (<>
              <line x1="38" y1="50" x2="52" y2="55" stroke="#241812" strokeWidth="3" strokeLinecap="round" />
              <line x1="82" y1="50" x2="68" y2="55" stroke="#241812" strokeWidth="3" strokeLinecap="round" />
            </>)}
            {/* mouth */}
            <path d={{
              happy: "M 48 80 Q 60 92 72 80",
              sad: "M 48 86 Q 60 78 72 86",
              angry: "M 48 84 Q 60 78 72 84",
              fear: "M 52 84 Q 60 80 68 84",
              disgust: "M 48 84 Q 60 82 72 86",
              neutral: "M 50 82 Q 60 86 70 82",
            }[mood] || "M 50 82 Q 60 86 70 82"} fill="none" stroke="#241812" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: t.body }}>
        {t.label}
      </div>
    </div>
  );
}
