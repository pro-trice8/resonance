// BruIntro.jsx — an onboarding tour where Bru introduces Resonance.
// Drop this file in frontend/app/ and import it in page.js.
"use client";
import { useState, useEffect } from "react";
import BeanBuddy from "./BeanBuddy";

const STEPS = [
  { mood: "happy", title: "Hey, I'm BeanBuddy \u2615", body: "Welcome to Resonance! I'm your emotionally-aware coffee companion. Let me show you around!" },
  { mood: "sad", title: "I hear how you feel", body: "Speak to me and I read the emotion in your voice using seven machine-learning models plus a fine-tuned AI transformer. Happy, sad, angry \u2014 I can tell." },
  { mood: "neutral", title: "I have two brains", body: "Switch between Groq and Gemini anytime from the bar below \u2014 two different AI models powering my replies." },
  { mood: "happy", title: "I can do fun stuff", body: "Ask me for a joke, an interesting fact, or a GIF \u2014 and sometimes I'll send a reaction GIF on my own when the mood is right!" },
  { mood: "happy", title: "Let's chat!", body: "Type a message or tap Speak to talk out loud. I'll even reply back in a real voice. Ready when you are!" },
];

export default function BruIntro() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // show automatically on first visit
    try {
      if (!localStorage.getItem("resonance_intro_seen")) setOpen(true);
    } catch {}
  }, []);

  function finish() {
    try { localStorage.setItem("resonance_intro_seen", "1"); } catch {}
    setOpen(false);
    setStep(0);
  }
  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  return (
    <>
      {/* floating help button (always available to replay) */}
      <button onClick={() => { setStep(0); setOpen(true); }}
        title="What is Resonance?"
        style={{ position: "fixed", top: 16, right: 18, zIndex: 60, width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--text-dim)", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
        ?
      </button>

      {open && (
        <div onClick={finish}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(10,7,5,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "8vh" }}>
          <div onClick={(e) => e.stopPropagation()}
            className="bru-pop"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, maxWidth: 440, width: "90%" }}>
            {/* BeanBuddy */}
            <div style={{ marginBottom: -10 }}>
              <BeanBuddy mood={STEPS[step].mood} size={120} />
            </div>
            {/* speech bubble */}
            <div style={{ position: "relative", background: "var(--panel)", border: "1.5px solid var(--line-2)", borderRadius: 18, padding: "22px 24px", width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
              <div className="serif" style={{ fontWeight: 900, fontSize: 22, color: "var(--cream)", marginBottom: 8 }}>{STEPS[step].title}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--text-dim)" }}>{STEPS[step].body}</div>

              {/* progress dots */}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "18px 0 16px" }}>
                {STEPS.map((_, i) => (
                  <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? "var(--accent)" : "var(--line-2)", transition: "all 0.3s" }} />
                ))}
              </div>

              {/* controls */}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={finish} className="mono" style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer" }}>Skip</button>
                <button onClick={next}
                  style={{ padding: "9px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#241812", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  {step < STEPS.length - 1 ? "Next" : "Let's go!"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
