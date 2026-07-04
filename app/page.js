"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import BeanBuddy from "./BeanBuddy";
import BruIntro from "./BruIntro";

const TALK_API = "https://sayantan17-resonance.hf.space/talk";
const TEXT_API = "https://sayantan17-resonance.hf.space/chat";
const STAGES = ["Hearing", "Feeling", "Thinking", "Speaking"];

const EMOTION_COLORS = {
  angry: "#e0654a", happy: "#e0a838", sad: "#6b93c9",
  neutral: "#b9a693", fear: "#b183d6", disgust: "#8bb56a",
};

const STORE_KEY = "resonance_convos";
function loadConvos() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; }
}
function saveConvos(c) { try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch {} }

// ---------- The mascot: an original coffee-cup character named Bru ----------
function Bru({ size = 40, mood = "neutral", talking = false, hero = false }) {
  const c = EMOTION_COLORS[mood] || "#d99058";
  const eyes = {
    happy:   { ry: 3.2, brow: 0, curve: "M 20 34 Q 32 42 44 34" },
    sad:     { ry: 4, brow: -3, curve: "M 20 38 Q 32 32 44 38" },
    angry:   { ry: 2.6, brow: -5, curve: "M 20 38 Q 32 34 44 38" },
    fear:    { ry: 5, brow: 2, curve: "M 22 37 Q 32 35 42 37" },
    disgust: { ry: 3, brow: -2, curve: "M 20 37 Q 32 35 44 39" },
    neutral: { ry: 3.4, brow: 0, curve: "M 22 36 Q 32 39 42 36" },
  }[mood] || { ry: 3.4, brow: 0, curve: "M 22 36 Q 32 39 42 36" };

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      className={hero ? "bru-hero" : talking ? "bru-talk" : "bru-idle"}>
      <div style={{ position: "absolute", top: -size * 0.28, left: 0, width: "100%", height: size * 0.4, display: "flex", justifyContent: "center", gap: size * 0.12 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="steam" style={{ width: 2.5, height: size * 0.3, background: "linear-gradient(to top, " + c + "88, transparent)", borderRadius: 4, animationDelay: i * 0.5 + "s", opacity: mood === "angry" ? 0.9 : 0.5 }} />
        ))}
      </div>
      <svg viewBox="0 0 64 72" width={size} height={size * 1.12} style={{ overflow: "visible" }}>
        <ellipse cx="32" cy="66" rx="26" ry="4" fill="rgba(0,0,0,0.25)" />
        <path d="M 52 34 q 12 2 10 14 q -2 8 -12 6" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
        <path d="M 10 26 L 54 26 L 50 60 Q 49 64 44 64 L 20 64 Q 15 64 14 60 Z" fill="url(#cupGrad)" stroke={c} strokeWidth="2.5" />
        <ellipse cx="32" cy="27" rx="22" ry="4" fill="#2a1a12" stroke={c} strokeWidth="2" />
        <ellipse cx="24" cy="42" rx="3" ry={eyes.ry} fill="#f2e8dd" />
        <ellipse cx="40" cy="42" rx="3" ry={eyes.ry} fill="#f2e8dd" />
        <circle cx="24" cy={42 + (mood === "sad" ? 1 : 0)} r="1.5" fill="#1a1310" />
        <circle cx="40" cy={42 + (mood === "sad" ? 1 : 0)} r="1.5" fill="#1a1310" />
        <line x1="20" y1={35 + eyes.brow} x2="28" y2={36 + eyes.brow * 0.4} stroke={c} strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1={36 + eyes.brow * 0.4} x2="44" y2={35 + eyes.brow} stroke={c} strokeWidth="2" strokeLinecap="round" />
        <path d={talking ? "M 26 50 Q 32 56 38 50" : eyes.curve.replace(/34/g, "50").replace(/38/g, "50").replace(/36/g, "50").replace(/37/g, "50").replace(/39/g, "52").replace(/42/g, "48").replace(/32/g, "50").replace(/35/g,"50")}
          fill="none" stroke="#f2e8dd" strokeWidth="2" strokeLinecap="round" />
        {mood === "happy" && (<>
          <circle cx="18" cy="47" r="2.5" fill={c} opacity="0.4" />
          <circle cx="46" cy="47" r="2.5" fill={c} opacity="0.4" />
        </>)}
        <defs>
          <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d2c22" />
            <stop offset="100%" stopColor="#2a1e18" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Home() {
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [bars, setBars] = useState(Array(44).fill(0.15));
  const [textInput, setTextInput] = useState("");
  const [openInsights, setOpenInsights] = useState(null);
  const [provider, setProvider] = useState("groq");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voice, setVoice] = useState("piper");

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const fileRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const threadRef = useRef(null);

  useEffect(() => {
    const c = loadConvos();
    setConvos(c);
    if (c.length) setActiveId(c[0].id);
  }, []);
  useEffect(() => { if (convos.length) saveConvos(convos); }, [convos]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const active = convos.find((c) => c.id === activeId) || null;
  const currentMood = active?.turns?.[active.turns.length - 1]?.emotion || "neutral";

  useEffect(() => {
    if (recording || busy) return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setBars((p) => p.map((_, i) => 0.15 + (Math.sin(t / 6 + i / 3.5) * 0.5 + 0.5) * 0.25));
    }, 110);
    return () => clearInterval(id);
  }, [recording, busy]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.turns?.length, busy]);

  function newConversation() {
    const id = Date.now().toString();
    setConvos((c) => [{ id, title: "New conversation", turns: [], created: Date.now() }, ...c]);
    setActiveId(id);
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
  }
  function deleteConversation(id, e) {
    e.stopPropagation();
    setConvos((c) => {
      const next = c.filter((x) => x.id !== id);
      saveConvos(next);
      if (id === activeId) setActiveId(next[0]?.id || null);
      return next;
    });
  }

  function startRename(c, e) {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameText(c.title);
  }
  function commitRename(id) {
    const t = renameText.trim();
    setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, title: t || c.title } : c)));
    setRenamingId(null);
    setRenameText("");
  }

  function buildHistory(convo) {
    if (!convo) return [];
    const h = [];
    for (const turn of convo.turns) {
      h.push({ role: "user", content: "[The speaker sounds " + turn.emotion + "] " + turn.transcript });
      h.push({ role: "assistant", content: turn.reply });
    }
    return h;
  }
  function ensureConvo() {
    let convo = active, cid = activeId;
    if (!convo) {
      cid = Date.now().toString();
      convo = { id: cid, title: "New conversation", turns: [], created: Date.now() };
      setConvos((c) => [convo, ...c]);
      setActiveId(cid);
    }
    return { convo, cid };
  }
  function appendTurn(cid, data) {
    setConvos((prev) => prev.map((c) => {
      if (c.id !== cid) return c;
      const turns = [...c.turns, data];
      const title = c.turns.length === 0 && data.transcript ? data.transcript.slice(0, 42) : c.title;
      return { ...c, turns, title };
    }));
  }

  const sendAudio = useCallback(async (blob) => {
    const { convo, cid } = ensureConvo();
    setBusy(true); setStage(0);
    const st = setInterval(() => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)), 1300);
    const form = new FormData();
    form.append("file", blob, "clip.wav");
    form.append("history", JSON.stringify(buildHistory(convo)));
    form.append("provider", provider);
    form.append("voice", voice);
    try {
      const res = await fetch(TALK_API, { method: "POST", body: form });
      const data = await res.json();
      clearInterval(st); setStage(-1); setBusy(false);
      if (data.error) { alert("Error: " + data.error); return; }
      appendTurn(cid, data);
      if (data.audio && audioRef.current) {
        const fmt = data.audio_format === "mp3" ? "audio/mpeg" : "audio/wav";
        audioRef.current.src = "data:" + fmt + ";base64," + data.audio;
        audioRef.current.play().catch(() => {});
      }
    } catch {
      clearInterval(st); setStage(-1); setBusy(false);
      alert("Couldn't reach the agent. Is the backend running on port 8080?");
    }
  }, [active, activeId, provider, voice]);

  const sendText = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg || busy) return;
    setTextInput("");
    const { convo, cid } = ensureConvo();
    setBusy(true); setStage(2);
    try {
      const res = await fetch(TEXT_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, history: buildHistory(convo), provider }),
      });
      const data = await res.json();
      setStage(-1); setBusy(false);
      if (data.error) { alert("Error: " + data.error); return; }
      appendTurn(cid, { transcript: msg, emotion: "neutral", gender: "—", reply: data.reply, typed: true });
    } catch {
      setStage(-1); setBusy(false);
      alert("Couldn't reach the agent (text). Make sure the /chat endpoint exists.");
    }
  }, [textInput, busy, active, activeId, provider]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      sendAudio(new Blob(chunksRef.current, { type: "audio/wav" }));
      stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
    mr.start();
    setRecording(true);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      analyser.getByteFrequencyData(data);
      setBars(Array.from({ length: 44 }, (_, i) => 0.12 + (data[i % data.length] || 0) / 255 * 0.8));
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }
  function stopRecording() { mediaRef.current?.stop(); setRecording(false); }

  const filtered = convos.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.turns.some((t) => (t.transcript || "").toLowerCase().includes(search.toLowerCase()))
  );
  const timeline = (active?.turns || []).map((t) => t.emotion).filter(Boolean);

  const sendStarter = useCallback(async (msg) => {
    if (!msg || busy) return;
    const { convo, cid } = ensureConvo();
    setBusy(true); setStage(2);
    try {
      const res = await fetch(TEXT_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, history: buildHistory(convo), provider }),
      });
      const data = await res.json();
      setStage(-1); setBusy(false);
      if (data.error) { alert("Error: " + data.error); return; }
      appendTurn(cid, { transcript: msg, emotion: "neutral", gender: "—", reply: data.reply, typed: true });
    } catch {
      setStage(-1); setBusy(false);
      alert("Couldn't reach the agent (text).");
    }
  }, [busy, active, activeId, provider]);

  const STARTERS = [
    "I've had a rough day and could use a pick-me-up.",
    "Tell me a joke to cheer me up!",
    "I'm feeling really excited about something.",
    "Share a random fun fact with me.",
  ];

  function replayTour() {
    try { localStorage.removeItem("resonance_intro_seen"); } catch {}
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#17110d", position: "relative", overflow: "hidden", color: "var(--text)" }}>
      <BruIntro />

      {/* mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }} />
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: 272, background: "#120d0a", borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: isMobile ? "fixed" : "relative", zIndex: 50, height: "100%",
        left: isMobile ? (sidebarOpen ? 0 : -290) : 0, top: 0, transition: "left 0.28s ease",
      }}>
        <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(140deg, #3a2a1e, #241812)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bru size={24} mood="happy" />
          </div>
          <div>
            <div className="serif" style={{ fontWeight: 900, fontSize: 20, lineHeight: 1, color: "#f2e8dd" }}>Resonance</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 3 }}>chats with Bru</div>
          </div>
        </div>

        <div style={{ padding: "0 14px" }}>
          <button onClick={newConversation}
            style={{ width: "100%", fontWeight: 600, fontSize: 14, padding: "13px", border: "none", borderRadius: 14, cursor: "pointer", background: "linear-gradient(140deg, #4a3526, #2f2016)", color: "#f2e8dd", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> New conversation
          </button>
          <div style={{ position: "relative", marginTop: 12 }}>
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: 13 }}>&#9906;</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats"
              style={{ width: "100%", padding: "11px 13px 11px 34px", fontSize: 13, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "rgba(255,255,255,0.03)", color: "var(--text)", outline: "none" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 10px" }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-faint)", padding: "18px 14px", textAlign: "center", lineHeight: 1.6 }}>
              No saved chats yet. Start talking to Bru!
            </div>
          ) : filtered.map((c) => {
            const em = c.turns[c.turns.length - 1]?.emotion;
            return (
              <div key={c.id} onClick={() => { setActiveId(c.id); if (isMobile) setSidebarOpen(false); }}
                style={{ padding: "11px 12px", marginBottom: 4, borderRadius: 12, cursor: "pointer", background: c.id === activeId ? "rgba(255,255,255,0.05)" : "transparent", display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s" }}
                onMouseEnter={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; const d = e.currentTarget.querySelector(".rowtools"); if (d) d.style.opacity = 1; }}
                onMouseLeave={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "transparent"; const d = e.currentTarget.querySelector(".rowtools"); if (d) d.style.opacity = 0; }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: EMOTION_COLORS[em] || "var(--text-faint)", flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  {renamingId === c.id ? (
                    <input autoFocus value={renameText}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameText(e.target.value)}
                      onBlur={() => commitRename(c.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitRename(c.id); if (e.key === "Escape") { setRenamingId(null); setRenameText(""); } }}
                      style={{ width: "100%", fontSize: 13, fontWeight: 500, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--accent)", background: "#1a1310", color: "var(--text)", outline: "none" }} />
                  ) : (
                    <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.id === activeId ? "#f2e8dd" : "var(--text-dim)" }}>{c.title}</div>
                  )}
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{c.turns.length} turn{c.turns.length !== 1 ? "s" : ""}</div>
                </div>
                {renamingId !== c.id && (
                  <div className="rowtools" style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                    <button onClick={(e) => startRename(c, e)} title="Rename" style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 2 }}>&#9998;</button>
                    <button onClick={(e) => deleteConversation(c.id, e)} title="Delete" style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 15, padding: 2 }}>&times;</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "13px 18px", fontSize: 11, color: "var(--text-faint)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          Chats are saved on this device.
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%", position: "relative", background: "radial-gradient(120% 80% at 50% 0%, #2b1d13 0%, #17110d 55%)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "14px 16px 14px 60px" : "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(20,14,10,0.5)", backdropFilter: "blur(8px)" }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{ position: "absolute", left: 14, top: 12, width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "var(--text)", fontSize: 17, cursor: "pointer" }}>&#9776;</button>
          )}
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(140deg, #3a2a1e, #241812)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bru size={22} mood={currentMood} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontWeight: 800, fontSize: 17, color: "#f2e8dd" }}>Chat with Bru</div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6fbf5a", display: "inline-block" }} />
              Emotion-aware voice companion
            </div>
          </div>
          {timeline.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, height: 20 }}>
              {timeline.slice(-14).map((em, i) => (
                <div key={i} title={em} style={{ width: 5, height: 8 + (i % 3) * 4, borderRadius: 2, background: EMOTION_COLORS[em] || "var(--text-faint)", opacity: 0.85, alignSelf: "flex-end" }} />
              ))}
            </div>
          )}
        </div>

        {/* thread / welcome */}
        <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 14px" : "30px 24px", minHeight: 0 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {(!active || active.turns.length === 0) && !busy ? (
              <div className="fade-up" style={{ textAlign: "center", paddingTop: isMobile ? "6vh" : "8vh" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", top: -6, left: -14, color: "#e0a838", fontSize: 20 }}>&#10022;</span>
                    <span style={{ position: "absolute", top: -2, right: -14, color: "#e0a838", fontSize: 15 }}>&#10022;</span>
                    <BeanBuddy mood="happy" size={110} />
                  </div>
                </div>
                <h1 className="serif" style={{ fontWeight: 900, fontSize: isMobile ? "34px" : "46px", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 14px", color: "#f4ece1" }}>
                  Pull up a chair
                </h1>
                <p style={{ color: "var(--text-dim)", fontSize: 15.5, maxWidth: 440, margin: "0 auto 30px", lineHeight: 1.6 }}>
                  Speak, type, or upload a clip. Bru listens for how you feel and replies out loud &mdash; with a little help from BeanBuddy.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, maxWidth: 540, margin: "0 auto" }}>
                  {STARTERS.map((sVal) => (
                    <button key={sVal} onClick={() => sendStarter(sVal)}
                      style={{ textAlign: "left", padding: "16px 18px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "var(--text)", fontSize: 14, lineHeight: 1.4, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(217,144,88,0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                      {sVal}
                    </button>
                  ))}
                </div>
                <button onClick={replayTour} className="mono" style={{ marginTop: 26, background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  &#8635; Replay the tour
                </button>
              </div>
            ) : (
              <>
                {active?.turns.map((turn, i) => (
                  <div key={i} className="fade-up" style={{ marginBottom: 26 }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <div style={{ maxWidth: "80%" }}>
                        <div style={{ background: "linear-gradient(135deg, #4a3526, #2f2016)", border: "1px solid rgba(255,255,255,0.08)", color: "#f2e8dd", padding: "12px 16px", borderRadius: "18px 18px 6px 18px", fontSize: 15, lineHeight: 1.5 }}>
                          {turn.transcript || "(couldn't make out words)"}
                        </div>
                        {!turn.typed && (
                          <div className="mono" style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
                            <Tag color={EMOTION_COLORS[turn.emotion]} filled>{turn.emotion}</Tag>
                            {turn.wav2vec_emotion && <Tag color={EMOTION_COLORS[turn.wav2vec_emotion]}>&#9671; {turn.wav2vec_emotion}{turn.wav2vec_confidence != null ? " " + Math.round(turn.wav2vec_confidence * 100) + "%" : ""}</Tag>}
                            {turn.gender && turn.gender !== "—" && <Tag>{turn.gender}</Tag>}
                            <button onClick={() => setOpenInsights(openInsights === i ? null : i)} className="mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-faint)", cursor: "pointer" }}>{openInsights === i ? "hide" : "models ▾"}</button>
                          </div>
                        )}
                        {openInsights === i && !turn.typed && <ModelInsights turn={turn} />}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: 11, alignItems: "flex-end" }}>
                      <Bru size={34} mood={turn.emotion || "neutral"} />
                      <div style={{ maxWidth: "82%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", borderRadius: "6px 18px 18px 18px" }}>
                        <ReplyContent text={turn.reply} />
                      </div>
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="fade-in" style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
                    <Bru size={34} mood={currentMood} talking />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {STAGES.map((sVal, i) => (
                        <div key={sVal} className="mono" style={{ fontSize: 11, padding: "6px 11px", borderRadius: 8, border: "1px solid " + (i <= stage ? "var(--accent-deep)" : "rgba(255,255,255,0.08)"), background: i <= stage ? "rgba(217,144,88,0.12)" : "rgba(255,255,255,0.03)", color: i <= stage ? "var(--accent)" : "var(--text-faint)", transition: "all 0.3s" }}>
                          {sVal}{i === stage ? "..." : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* BeanBuddy floating (during active chat) */}
        {active && active.turns.length > 0 && (
          <div style={{ position: "absolute", right: isMobile ? 8 : 20, bottom: isMobile ? 150 : 170, zIndex: 2, pointerEvents: "none", opacity: 0.9 }}>
            <BeanBuddy mood={currentMood} size={isMobile ? 58 : 96} />
          </div>
        )}

        {/* COMPOSER */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(18,13,10,0.85)", backdropFilter: "blur(10px)", padding: isMobile ? "12px 12px calc(14px + env(safe-area-inset-bottom))" : "16px 24px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* pill toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>Brain</span>
              {[["groq", "Groq"], ["gemini", "Gemini"]].map(([v, label]) => (
                <button key={v} onClick={() => setProvider(v)} className="mono"
                  style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "none", background: provider === v ? "#3a2a1e" : "transparent", color: provider === v ? "#f2e8dd" : "var(--text-faint)", fontWeight: provider === v ? 600 : 400 }}>{label}</button>
              ))}
              <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>Voice</span>
              {[["piper", "Piper"], ["eleven", "ElevenLabs"]].map(([v, label]) => (
                <button key={v} onClick={() => setVoice(v)} className="mono"
                  style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: "none", background: voice === v ? "#3a2a1e" : "transparent", color: voice === v ? "#f2e8dd" : "var(--text-faint)", fontWeight: voice === v ? 600 : 400 }}>{label}</button>
              ))}
            </div>
            {/* input pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 26, padding: "8px 8px 8px 16px", boxShadow: recording ? "0 0 26px var(--glow)" : "none", transition: "box-shadow 0.4s" }}>
              <button onClick={() => fileRef.current?.click()} disabled={busy} title="Upload a clip"
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", fontSize: 18, cursor: busy ? "default" : "pointer", flexShrink: 0, opacity: busy ? 0.4 : 1 }}>&#128206;</button>
              <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && sendAudio(e.target.files[0])} />
              <input value={textInput} onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
                placeholder="Tell Bru how you feel..." disabled={busy}
                style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 15, outline: "none", minWidth: 0 }} />
              {textInput.trim() && !recording && (
                <button onClick={sendText} disabled={busy} style={{ height: 38, padding: "0 18px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#241812", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Send</button>
              )}
              <button onClick={recording ? stopRecording : startRecording} disabled={busy} title={recording ? "Stop & send" : "Speak"}
                style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: busy ? "default" : "pointer", background: recording ? "#c0472e" : "linear-gradient(135deg, #4a3526, #2f2016)", color: recording ? "#fff" : "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, boxShadow: recording ? "0 0 18px rgba(224,74,48,0.5)" : "none" }}>
                {recording ? <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fff" }} /> : busy ? "..." : "🎙"}
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
              Type, upload audio, or tap the mic to speak.
            </div>
          </div>
        </div>
      </main>
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}


function ReplyContent({ text }) {
  let gifUrl = null;
  const marker = text.match(/\[GIF\](.*?)\[\/GIF\]/);
  if (marker) {
    gifUrl = marker[1];
  } else {
    const raw = text.match(/https?:\/\/[^\s]*giphy\.com\/[^\s]+\.gif/i);
    if (raw) gifUrl = raw[0];
  }

  if (!gifUrl) {
    return <div className="serif" style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--text)" }}>{text}</div>;
  }

  const cleanText = text
    .replace(/\[GIF\].*?\[\/GIF\]/, "")
    .replace(/https?:\/\/[^\s]*giphy\.com\/[^\s]+\.gif/i, "")
    .replace(/\(You found a GIF.*?\)/, "")
    .trim();

  return (
    <div>
      {cleanText && <div className="serif" style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--text)", marginBottom: 10 }}>{cleanText}</div>}
      <img src={gifUrl} alt="reaction gif" style={{ maxWidth: "100%", borderRadius: 12, display: "block" }} />
      <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 4, textAlign: "right" }}>via GIPHY</div>
    </div>
  );
}
function Tag({ children, color, filled }) {
  const c = color || "var(--text-faint)";
  return (
    <span className="mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, textTransform: "capitalize", border: "1px solid " + (filled ? "transparent" : "var(--line-2)"), background: filled ? (c + "22") : "transparent", color: filled ? c : "var(--text-dim)", letterSpacing: "0.02em" }}>{children}</span>
  );
}

function ModelInsights({ turn }) {
  const rows = [
    { name: "Ensemble (SVM·RF·XGB·CNN)", val: turn.ensemble_emotion || turn.emotion, conf: null },
    { name: "Wav2Vec2 transformer", val: turn.wav2vec_emotion, conf: turn.wav2vec_confidence },
    { name: "Gender ensemble", val: turn.gender, conf: null },
  ];
  return (
    <div className="fade-up mono" style={{ marginTop: 8, background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "12px 14px", maxWidth: 340, marginLeft: "auto" }}>
      <div style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.08em", marginBottom: 9 }}>WHAT THE MODELS HEARD</div>
      {rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: "var(--text-dim)" }}>{r.name}</span>
            <span style={{ color: EMOTION_COLORS[r.val] || "var(--text)", textTransform: "capitalize" }}>{r.val}</span>
          </div>
          <div style={{ height: 4, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (r.conf != null ? Math.round(r.conf * 100) : 100) + "%", background: EMOTION_COLORS[r.val] || "var(--accent)", borderRadius: 3, animation: "growBar 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
