"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import BeanBuddy from "./BeanBuddy";

const TALK_API = "http://localhost:8080/talk";
const TEXT_API = "http://localhost:8080/chat";
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
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [bars, setBars] = useState(Array(44).fill(0.15));
  const [textInput, setTextInput] = useState("");
  const [openInsights, setOpenInsights] = useState(null);
  const [provider, setProvider] = useState("groq");
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
      appendTurn(cid, { transcript: msg, emotion: "neutral", gender: "\u2014", reply: data.reply, typed: true });
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

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} className="bean" style={{ left: (8 + i * 11) + "%", animationDelay: i * 2.3 + "s", animationDuration: (16 + i * 2) + "s" }}>
            <svg width="16" height="20" viewBox="0 0 16 20"><ellipse cx="8" cy="10" rx="6" ry="9" fill="#3d2c22" /><path d="M 8 2 Q 11 10 8 18" stroke="#2a1e18" strokeWidth="1.5" fill="none" /></svg>
          </span>
        ))}
      </div>

      <aside style={{ width: 268, background: "var(--bg-2)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{ padding: "18px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Bru size={30} mood="happy" />
            <span className="serif" style={{ fontWeight: 900, fontSize: 19, letterSpacing: "-0.01em", color: "var(--cream)" }}>Resonance</span>
          </div>
          <button onClick={newConversation}
            style={{ width: "100%", fontWeight: 600, fontSize: 13.5, padding: "11px", border: "1px solid var(--line-2)", borderRadius: 10, cursor: "pointer", background: "var(--panel-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.18s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--panel-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--panel-2)"; }}>
            <span style={{ fontSize: 16, lineHeight: 1, color: "var(--accent)" }}>+</span> New conversation
          </button>
          <div style={{ position: "relative", marginTop: 10 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="mono" style={{ width: "100%", padding: "9px 11px 9px 30px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel)", color: "var(--text)", outline: "none" }} />
            <span className="mono" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-faint)" }}>&#9906;</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 16px" }}>
          {filtered.length === 0 ? (
            <div className="mono" style={{ fontSize: 11.5, color: "var(--text-faint)", padding: "14px 12px", textAlign: "center", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {convos.length === 0 ? "No conversations yet.\nSpeak to begin." : "No matches"}
            </div>
          ) : filtered.map((c) => {
            const em = c.turns[c.turns.length - 1]?.emotion;
            return (
              <div key={c.id} onClick={() => setActiveId(c.id)} className="fade-in"
                style={{ padding: "10px 11px", marginBottom: 3, borderRadius: 9, cursor: "pointer", background: c.id === activeId ? "var(--panel)" : "transparent", display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s" }}
                onMouseEnter={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "var(--panel)"; e.currentTarget.querySelector(".del").style.opacity = 1; }}
                onMouseLeave={(e) => { if (c.id !== activeId) e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector(".del").style.opacity = 0; }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: EMOTION_COLORS[em] || "var(--text-faint)", flexShrink: 0, boxShadow: em ? "0 0 6px " + (EMOTION_COLORS[em] || "transparent") : "none" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.id === activeId ? "var(--text)" : "var(--text-dim)" }}>{c.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{c.turns.length} turn{c.turns.length !== 1 ? "s" : ""}</div>
                </div>
                <button className="del" onClick={(e) => deleteConversation(c.id, e)}
                  style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 15, opacity: 0, transition: "opacity 0.15s", flexShrink: 0, lineHeight: 1 }}>&times;</button>
              </div>
            );
          })}
        </div>

        <div className="mono" style={{ padding: "13px 16px", fontSize: 9.5, color: "var(--text-faint)", borderTop: "1px solid var(--line)", letterSpacing: "0.03em", lineHeight: 1.7 }}>
          7-MODEL ENSEMBLE &middot; WAV2VEC2<br />GROQ &middot; GEMINI &middot; WHISPER
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "radial-gradient(ellipse 70% 55% at 50% -5%, #2a1d15 0%, var(--bg) 55%)", position: "relative", zIndex: 1 }}>
        {timeline.length > 0 && (
          <div style={{ borderBottom: "1px solid var(--line)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, background: "rgba(26,19,16,0.6)", backdropFilter: "blur(8px)" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>MOOD ARC</span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: 1, height: 22 }}>
              {timeline.map((em, i) => (
                <div key={i} title={em} style={{ flex: 1, maxWidth: 40, height: 8 + (i % 3) * 4, borderRadius: 3, background: EMOTION_COLORS[em] || "var(--text-faint)", opacity: 0.85, alignSelf: "flex-end" }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
              now: <span style={{ color: EMOTION_COLORS[timeline[timeline.length - 1]] }}>{timeline[timeline.length - 1]}</span>
            </span>
          </div>
        )}

        <div style={{ position: "absolute", right: 20, bottom: 130, zIndex: 2, pointerEvents: "none", opacity: 0.96 }}>
          <BeanBuddy mood={currentMood} size={130} />
        </div>

        <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "30px 24px 20px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {(!active || active.turns.length === 0) && !busy && (
              <div className="fade-up" style={{ textAlign: "center", paddingTop: "9vh" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <Bru size={92} mood="happy" hero />
                </div>
                <h1 className="serif" style={{ fontWeight: 900, fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.03, letterSpacing: "-0.03em", margin: "0 0 14px", color: "var(--cream)" }}>
                  Hey, I'm Bru.<br />I hear <em style={{ fontStyle: "italic", color: "var(--accent)" }}>how</em> you feel.
                </h1>
                <p style={{ color: "var(--text-dim)", fontSize: 15.5, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                  Speak or type. I read your words and the emotion in your voice, then answer warmly &mdash; and watch my face, I change with your mood.
                </p>
              </div>
            )}

            {active?.turns.map((turn, i) => (
              <div key={i} className="fade-up" style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <div style={{ maxWidth: "80%" }}>
                    <div style={{ background: "linear-gradient(135deg, var(--panel-3), var(--panel-2))", border: "1px solid var(--line-2)", color: "var(--text)", padding: "12px 16px", borderRadius: "16px 16px 5px 16px", fontSize: 15, lineHeight: 1.5 }}>
                      {turn.transcript || "(couldn't make out words)"}
                    </div>
                    {!turn.typed && (
                      <div className="mono" style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
                        <Tag color={EMOTION_COLORS[turn.emotion]} filled>{turn.emotion}</Tag>
                        {turn.wav2vec_emotion && <Tag color={EMOTION_COLORS[turn.wav2vec_emotion]}>&#9671; {turn.wav2vec_emotion}{turn.wav2vec_confidence != null ? " " + Math.round(turn.wav2vec_confidence * 100) + "%" : ""}</Tag>}
                        {turn.gender && turn.gender !== "\u2014" && <Tag>{turn.gender}</Tag>}
                        <button onClick={() => setOpenInsights(openInsights === i ? null : i)}
                          className="mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line-2)", background: "transparent", color: "var(--text-faint)", cursor: "pointer" }}>
                          {openInsights === i ? "hide" : "models ▾"}
                        </button>
                      </div>
                    )}
                    {openInsights === i && !turn.typed && <ModelInsights turn={turn} />}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 11, alignItems: "flex-end" }}>
                  <Bru size={34} mood={turn.emotion || "neutral"} />
                  <div style={{ maxWidth: "82%", background: "var(--panel)", border: "1px solid var(--line)", padding: "14px 18px", borderRadius: "5px 16px 16px 16px" }}>
                    <ReplyContent text={turn.reply} />
                  </div>
                </div>
              </div>
            ))}

            {busy && (
              <div className="fade-in" style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
                <Bru size={34} mood={currentMood} talking />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STAGES.map((s, i) => (
                    <div key={s} className="mono" style={{ fontSize: 11, padding: "6px 11px", borderRadius: 7, border: "1px solid " + (i <= stage ? "var(--accent-deep)" : "var(--line)"), background: i <= stage ? "rgba(217,144,88,0.12)" : "var(--panel)", color: i <= stage ? "var(--accent)" : "var(--text-faint)", transition: "all 0.3s" }}>
                      {s}{i === stage ? "..." : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)", padding: "16px 24px 22px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ border: "1px solid var(--line-2)", borderRadius: 18, background: "var(--panel)", padding: "12px 14px 10px", boxShadow: recording ? "0 0 28px var(--glow)" : "none", transition: "box-shadow 0.4s" }}>
              {/* text input row */}
              <input value={textInput} onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
                placeholder="Message Bru, or speak below..." disabled={busy}
                style={{ width: "100%", padding: "6px 8px 10px", fontSize: 15, border: "none", background: "transparent", color: "var(--text)", outline: "none" }} />
              {/* controls row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* upload */}
                <button onClick={() => fileRef.current?.click()} disabled={busy} title="Upload a clip"
                  style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--line-2)", background: "transparent", color: "var(--text-dim)", fontSize: 18, cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: busy ? 0.4 : 1 }}>+</button>
                <input ref={fileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && sendAudio(e.target.files[0])} />

                {/* brain dropdown */}
                <div style={{ position: "relative" }}>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)}
                    className="mono" style={{ appearance: "none", border: "1px solid var(--line-2)", borderRadius: 9, background: "var(--panel-2)", color: "var(--text-dim)", fontSize: 11.5, padding: "6px 24px 6px 10px", cursor: "pointer", outline: "none" }}>
                    <option value="groq">Groq</option>
                    <option value="gemini">Gemini</option>
                  </select>
                  <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)", fontSize: 9 }}>▾</span>
                </div>

                {/* voice dropdown */}
                <div style={{ position: "relative" }}>
                  <select value={voice} onChange={(e) => setVoice(e.target.value)}
                    className="mono" style={{ appearance: "none", border: "1px solid var(--line-2)", borderRadius: 9, background: "var(--panel-2)", color: "var(--text-dim)", fontSize: 11.5, padding: "6px 24px 6px 10px", cursor: "pointer", outline: "none" }}>
                    <option value="piper">Piper</option>
                    <option value="eleven">ElevenLabs</option>
                  </select>
                  <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)", fontSize: 9 }}>▾</span>
                </div>

                {/* mini waveform */}
                <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 26, flex: 1, overflow: "hidden", justifyContent: "center" }}>
                  {bars.slice(0, 28).map((h, i) => (
                    <span key={i} style={{ width: 2, height: Math.max(3, h * 22), background: recording ? "var(--accent)" : busy ? "var(--accent-2)" : "var(--line-2)", borderRadius: 3, transition: "height 0.08s ease, background 0.4s", opacity: recording || busy ? 1 : 0.55 }} />
                  ))}
                </div>

                {/* text send (when typing) */}
                {textInput.trim() && !recording && (
                  <button onClick={sendText} disabled={busy}
                    style={{ height: 34, padding: "0 16px", borderRadius: 17, border: "none", background: "var(--panel-3)", color: "var(--text)", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Send</button>
                )}

                {/* speak / stop */}
                <button onClick={recording ? stopRecording : startRecording} disabled={busy}
                  title={recording ? "Stop & send" : "Speak"}
                  style={{ height: 34, padding: recording ? "0 16px" : "0", width: recording ? "auto" : 34, borderRadius: 17, border: "none", cursor: busy ? "default" : "pointer", background: recording ? "#c0472e" : busy ? "var(--panel-2)" : "linear-gradient(135deg, var(--accent), var(--accent-2))", color: recording || !busy ? "#241812" : "var(--text-faint)", opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0, fontWeight: 600, fontSize: 13, boxShadow: !busy && !recording ? "0 0 16px var(--glow)" : "none" }}>
                  {recording ? (<><span style={{ width: 8, height: 8, borderRadius: 2, background: "#fff" }} /> Stop</>) : busy ? "..." : (<span style={{ fontSize: 15 }}>🎙</span>)}
                </button>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", marginTop: 8, letterSpacing: "0.04em" }}>
              7-model ensemble · Wav2Vec2 · {provider === "groq" ? "Groq" : "Gemini"} · {voice === "eleven" ? "ElevenLabs" : "Piper"}
            </div>
          </div>
        </div>
      </main>
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}

function ReplyContent({ text }) {
  const match = text.match(/\[GIF\](.*?)\[\/GIF\]/);
  if (!match) {
    return <div className="serif" style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--text)" }}>{text}</div>;
  }
  const gifUrl = match[1];
  const cleanText = text.replace(/\[GIF\].*?\[\/GIF\]/, "").replace(/\(You found a GIF.*?\)/, "").trim();
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
