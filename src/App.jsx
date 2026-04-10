/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";

// ━━━ CONSTANTS ━━━
const LAUNCH_TIME = new Date("2026-04-01T22:35:00Z");

const CREW = [
  { name: "Reid Wiseman", role: "Commander", agency: "NASA" },
  { name: "Victor Glover", role: "Pilot", agency: "NASA" },
  { name: "Christina Koch", role: "Specialist", agency: "NASA" },
  { name: "Jeremy Hansen", role: "Specialist", agency: "CSA" },
];

function pad(n) { return String(n).padStart(2, "0"); }

// ━━━ COMPONENTS ━━━

function StarField() {
  const stars = useRef(
    Array.from({ length: 80 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 1.8 + 0.4, o: Math.random() * 0.5 + 0.3,
      d: Math.random() * 4 + 2, dl: Math.random() * 3,
    }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      {stars.current.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.s, height: s.s, borderRadius: "50%", background: "#fff",
          opacity: s.o, animation: `tw ${s.d}s ease-in-out infinite alternate`,
          animationDelay: `${s.dl}s`,
        }} />
      ))}
    </div>
  );
}

function METClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const met = now - LAUNCH_TIME.getTime();
  const abs = Math.abs(met);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const sign = met >= 0 ? "+" : "-";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, letterSpacing: 4, color: "#7fdbca", textTransform: "uppercase", marginBottom: 6 }}>
        Mission Elapsed Time
      </div>
      <div style={{ fontFamily: "mono, 'Courier New', monospace", fontSize: 38, fontWeight: 700, color: "#e6f1ff", letterSpacing: 2 }}>
        T{sign}{pad(d)}:{pad(h)}:{pad(m)}:{pad(s)}
      </div>
    </div>
  );
}

function FetchIndicator({ fetchState, data }) {
  const { status, lastError: fetchError, countdown } = fetchState;
  const { update, lastError } = data;
  
  const colors = {
    idle: "#5a8a9a",
    fetching: "#7fdbca",
    success: "#c3e88d",
    error: "#ff5353",
  };
  const labels = {
    idle: countdown > 0 ? `Next poll in ${Math.ceil(countdown / 1000)}s` : "Idle",
    fetching: "Fetching…",
    success: "Updated",
    error: fetchError ? `Error: ${fetchError.slice(0, 40)}` : "Fetch failed",
  };
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "6px 0", fontSize: 11, color: colors[status],
      fontFamily: "mono, 'Courier New', monospace", transition: "color 0.3s",
      flexWrap: "wrap",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: colors[status],
        boxShadow: status === "fetching" ? `0 0 8px ${colors[status]}` : "none",
        animation: status === "fetching" ? "pulse 1.5s ease-in-out infinite" : "none",
        flexShrink: 0,
      }} />
      <span>{labels[status]}</span>
      
      {update?.fetchedAt && (
        <span style={{ color: "#5a8a9a" }}>
          · last: {new Date(update.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}

      {lastError && (
        <span title={lastError} style={{ color: "#ff5353", background: "rgba(255,83,83,0.1)", padding: "1px 6px", borderRadius: 4, cursor: "help" }}>
          ⚠️ Pipeline Fail
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status, label }) {
  const c = {
    nominal: { bg: "rgba(195,232,141,0.12)", border: "rgba(195,232,141,0.3)", text: "#c3e88d" },
    caution: { bg: "rgba(255,203,107,0.12)", border: "rgba(255,203,107,0.3)", text: "#ffcb6b" },
    warning: { bg: "rgba(255,149,0,0.12)", border: "rgba(255,149,0,0.3)", text: "#ff9500" },
    emergency: { bg: "rgba(255,83,83,0.15)", border: "rgba(255,83,83,0.4)", text: "#ff5353" },
  }[status] || { bg: "rgba(130,170,255,0.1)", border: "rgba(130,170,255,0.2)", text: "#82aaff" };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20,
      padding: "5px 14px", fontSize: 11, letterSpacing: 2, color: c.text,
      textTransform: "uppercase", fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.text, boxShadow: `0 0 8px ${c.text}`, animation: "pulse 2s ease-in-out infinite" }} />
      {label}
    </div>
  );
}

function LiveBriefing({ update, fetchState }) {
  return (
    <div style={{
      background: "rgba(10,22,40,0.6)", border: "1px solid rgba(127,219,202,0.15)",
      borderRadius: 20, padding: 24, marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 14, letterSpacing: 3, color: "#7fdbca", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
          Live Briefing
        </h2>
        <div style={{ fontSize: 10, color: "#5a8a9a", fontFamily: "mono, 'Courier New', monospace" }}>
          LIVE AUTO-UPDATE
        </div>
      </div>

      {!update && fetchState.status === "fetching" && (
        <div style={{ textAlign: "center", padding: 40, color: "#5a8a9a" }}>
          <div style={{ fontSize: 24, marginBottom: 10, animation: "pulse 1.5s ease-in-out infinite" }}>📡</div>
          <div style={{ fontSize: 13 }}>Connecting to mission control…</div>
        </div>
      )}

      {!update && fetchState.status === "success" && (
        <div style={{ textAlign: "center", padding: 40, color: "#5a8a9a" }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🛰️</div>
          <div style={{ fontSize: 13 }}>Waiting for first mission briefing…</div>
          <div style={{ fontSize: 10, marginTop: 8 }}>The AI will generate an update shortly.</div>
        </div>
      )}

      {!update && fetchState.status === "error" && (
        <div style={{ textAlign: "center", padding: 32, color: "#ff5353" }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Connection Error</div>
          <div style={{ fontSize: 11, color: "#5a8a9a" }}>{fetchState.lastError}</div>
        </div>
      )}

      {update && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <StatusBadge status={update.status} label={update.statusLabel} />
          </div>

          {update.alertMessage && (
            <div style={{
              background: "rgba(255,83,83,0.1)", border: "1px solid rgba(255,83,83,0.35)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#ff5353", textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>Alert</div>
                <div style={{ fontSize: 13, color: "#e6f1ff" }}>{update.alertMessage}</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 16, fontWeight: 700, color: "#e6f1ff", marginBottom: 4, lineHeight: 1.4 }}>
            {update.headline}
          </div>
          <div style={{ fontSize: 12, color: "#7fdbca", marginBottom: 14 }}>{update.currentPhase}</div>

          {update.details && update.details.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {update.details.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 13, color: "#c5d5e4" }}>
                  <span style={{ color: "#5a8a9a", flexShrink: 0 }}>›</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {update.lastEvent && (
              <div style={{ background: "rgba(130,170,255,0.06)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#5a8a9a", textTransform: "uppercase", marginBottom: 4 }}>Last Event</div>
                <div style={{ fontSize: 12, color: "#c5d5e4" }}>{update.lastEvent}</div>
              </div>
            )}
            {update.nextEvent && (
              <div style={{ background: "rgba(127,219,202,0.06)", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#7fdbca", textTransform: "uppercase", marginBottom: 4 }}>Next Up</div>
                <div style={{ fontSize: 12, color: "#c5d5e4" }}>{update.nextEvent}</div>
              </div>
            )}
          </div>

          {update.crewStatus && (
            <div style={{ fontSize: 12, color: "#8badc1", borderTop: "1px solid rgba(130,170,255,0.08)", paddingTop: 10, marginBottom: 6 }}>
              <span style={{ color: "#5a8a9a", fontWeight: 600 }}>Crew: </span>{update.crewStatus}
            </div>
          )}
          {update.sources && update.sources.length > 0 && (
            <div style={{ fontSize: 10, color: "#3d5a6e" }}>Sources: {update.sources.join(" · ")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const pct = Math.min(100, Math.max(0, ((now - LAUNCH_TIME.getTime()) / (10 * 86400000)) * 100));
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(130,170,255,0.1)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 3,
          background: "linear-gradient(90deg, #7fdbca, #82aaff, #c792ea)",
          transition: "width 1s linear", boxShadow: "0 0 12px rgba(127,219,202,0.4)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a8a9a", marginTop: 4, fontFamily: "mono, 'Courier New', monospace" }}>
        <span>LAUNCH</span><span>SPLASHDOWN</span>
      </div>
    </div>
  );
}

function Stats({ milestones }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const elapsed = now - LAUNCH_TIME.getTime();
  const day = Math.min(10, Math.max(1, Math.ceil(elapsed / 86400000)));
  const done = milestones.filter((m) => m.completed || new Date(m.time).getTime() <= now).length;
  const pct = Math.min(100, Math.max(0, (elapsed / (10 * 86400000)) * 100));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
      {[
        { label: "Day", value: day, sfx: "/10" },
        { label: "Milestones", value: done, sfx: `/${milestones.length}` },
        { label: "Progress", value: pct.toFixed(1), sfx: "%" },
      ].map((s) => (
        <div key={s.label} style={{ background: "rgba(130,170,255,0.06)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#5a8a9a", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontFamily: "mono, 'Courier New', monospace", fontSize: 22, fontWeight: 700, color: "#e6f1ff" }}>
            {s.value}<span style={{ fontSize: 12, color: "#5a8a9a", fontWeight: 400 }}>{s.sfx}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PollConfig({ interval, setInterval: setInt }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: "#5a8a9a", letterSpacing: 2, textTransform: "uppercase" }}>Auto-refresh:</span>
      {[
        { label: "1m", val: 60000 }, { label: "2m", val: 120000 },
        { label: "5m", val: 300000 }, { label: "Off", val: 0 },
      ].map((o) => (
        <button key={o.label} onClick={() => setInt(o.val)} style={{
          background: interval === o.val ? "rgba(127,219,202,0.15)" : "rgba(130,170,255,0.06)",
          border: `1px solid ${interval === o.val ? "rgba(127,219,202,0.4)" : "rgba(130,170,255,0.1)"}`,
          borderRadius: 6, padding: "4px 10px", fontSize: 11,
          color: interval === o.val ? "#7fdbca" : "#5a8a9a", cursor: "pointer", fontWeight: 600,
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function Timeline({ milestones }) {
  const now = Date.now();
  const groups = {};
  milestones.forEach((m) => { const k = `Day ${m.day}`; if (!groups[k]) groups[k] = []; groups[k].push(m); });
  const nextIdx = milestones.findIndex((m) => !m.completed && new Date(m.time).getTime() > now);
  return (
    <div style={{ background: "rgba(10,22,40,0.5)", border: "1px solid rgba(130,170,255,0.1)", borderRadius: 20, padding: 24 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 3, color: "#7fdbca", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Timeline</h2>
      {Object.entries(groups).map(([day, items]) => (
        <div key={day} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#8badc1", textTransform: "uppercase", marginBottom: 6, paddingLeft: 28, fontWeight: 600 }}>{day}</div>
          {items.map((m) => {
            const mTime = new Date(m.time);
            const isPast = m.completed || mTime.getTime() <= now;
            const isNext = milestones.indexOf(m) === nextIdx;
            return (
              <div key={m.id} style={{
                display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                background: isNext ? "rgba(127,219,202,0.08)" : m.isNew ? "rgba(199,146,234,0.06)" : "transparent",
                borderLeft: isNext ? "2px solid #7fdbca" : m.isNew ? "2px solid rgba(199,146,234,0.4)" : "2px solid transparent",
                opacity: isPast ? 0.6 : 1,
              }}>
                <div style={{ fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 }}>{isPast ? "✓" : m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isPast ? "#8badc1" : m.highlight ? "#ffcb6b" : "#e6f1ff" }}>{m.label}</span>
                    {m.isNew && <span style={{ fontSize: 9, background: "rgba(199,146,234,0.2)", color: "#c792ea", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#7a9aaa", marginTop: 1 }}>{m.detail}</div>
                </div>
                <div style={{ fontSize: 10, fontFamily: "mono, 'Courier New', monospace", color: isPast ? "#8badc1" : "#6b9eb5", flexShrink: 0 }}>
                  {mTime.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function UpdateLog({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div style={{
      background: "rgba(10,22,40,0.5)", border: "1px solid rgba(130,170,255,0.1)",
      borderRadius: 20, padding: 24, marginBottom: 16,
    }}>
      <h2 style={{ fontSize: 14, letterSpacing: 3, color: "#7fdbca", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
        Update Log
      </h2>
      {history.slice(0, 8).map((u, i) => (
        <div key={i} style={{
          padding: "8px 0",
          borderBottom: i < Math.min(history.length - 1, 7) ? "1px solid rgba(130,170,255,0.06)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#c5d5e4" }}>{u.headline}</span>
            <span style={{ fontSize: 10, color: "#3d5a6e", fontFamily: "mono, 'Courier New', monospace", flexShrink: 0 }}>
              {new Date(u.fetchedAt).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#5a8a9a", marginTop: 2 }}>{u.currentPhase}</div>
        </div>
      ))}
    </div>
  );
}

// ━━━ APP ━━━
export default function App() {
  const [data, setData] = useState({ update: null, milestones: [], history: [], lastError: null });
  const [pollInterval, setPollInterval] = useState(60000);
  const [fetchState, setFetchState] = useState({
    status: "idle", // idle | fetching | success | error
    lastSuccess: null,
    lastError: null,
    countdown: 0,
  });
  const pollTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const nextPollRef = useRef(null);

  const doFetch = useCallback(async () => {
    setFetchState((p) => ({ ...p, status: "fetching", lastError: null }));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const timestamp = new Date().getTime(); // Prevent caching
      const response = await fetch(`data.json?t=${timestamp}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const newData = await response.json();
      
      setData(newData);
      setFetchState((p) => ({ ...p, status: "success", lastSuccess: Date.now(), lastError: null }));
    } catch (err) {
      setFetchState((p) => ({ ...p, status: "error", lastError: err.message || "Unknown error" }));
    }
    // Reset countdown
    if (pollInterval > 0) {
      nextPollRef.current = Date.now() + pollInterval;
    }
  }, [pollInterval]);

  // Initial fetch
  useEffect(() => { doFetch(); }, [doFetch]);

  // Polling timer
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (pollInterval > 0) {
      nextPollRef.current = Date.now() + pollInterval;
      pollTimerRef.current = setInterval(() => { doFetch(); }, pollInterval);
    }
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [doFetch, pollInterval]);

  // Countdown display
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      if (pollInterval === 0) {
        setFetchState((p) => (p.status === "fetching" ? p : { ...p, countdown: 0 }));
        return;
      }
      const remaining = Math.max(0, (nextPollRef.current || 0) - Date.now());
      setFetchState((p) => (p.status === "fetching" ? p : { ...p, countdown: remaining }));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [pollInterval]);

  const manualRefresh = useCallback(() => {
    if (fetchState.status === "fetching") return;
    doFetch();
    if (pollInterval > 0) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      nextPollRef.current = Date.now() + pollInterval;
      pollTimerRef.current = setInterval(() => { doFetch(); }, pollInterval);
    }
  }, [doFetch, fetchState.status, pollInterval]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(170deg, #0a1628 0%, #0d1f3c 40%, #0a1628 100%)",
      color: "#c5d5e4", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", position: "relative",
    }}>
      <StarField />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 800,
            background: "linear-gradient(135deg, #e6f1ff, #7fdbca, #82aaff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -0.5, marginBottom: 6,
          }}>ARTEMIS II Tracker</h1>
          <div style={{ fontSize: 12, color: "#6a8fa0" }}>4 astronauts · 10-day lunar flyby · 685,000 miles</div>
        </div>

        <div style={{
          background: "rgba(10,22,40,0.7)", border: "1px solid rgba(127,219,202,0.15)",
          borderRadius: 20, padding: 20, marginBottom: 16, animation: "glow 4s ease-in-out infinite",
        }}>
          <METClock />
        </div>

        <ProgressBar />
        {data.milestones.length > 0 && <Stats milestones={data.milestones} />}
        
        <FetchIndicator fetchState={fetchState} data={data} update={data.update} />

        <div style={{ height: 12 }} />

        <LiveBriefing update={data.update} fetchState={fetchState} />
        {data.history && data.history.length > 0 && <UpdateLog history={data.history} />}
        {data.milestones.length > 0 && <Timeline milestones={data.milestones} />}

        <div style={{ marginTop: 16, background: "rgba(10,22,40,0.5)", border: "1px solid rgba(130,170,255,0.1)", borderRadius: 20, padding: 24 }}>
          <h2 style={{ fontSize: 14, letterSpacing: 3, color: "#7fdbca", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Crew</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {CREW.map((c) => (
              <div key={c.name} style={{
                background: "rgba(130,170,255,0.06)", border: "1px solid rgba(130,170,255,0.12)",
                borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7fdbca, #82aaff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13, color: "#0a1628", flexShrink: 0,
                }}>{c.name.split(" ").map((w) => w[0]).join("")}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e6f1ff" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#5a8a9a" }}>{c.role} · {c.agency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 10, color: "#2d4a5e" }}>
          Backend powered by Gemini AI Pro · Frontend is static and freely scalable
        </div>
      </div>
    </div>
  );
}
