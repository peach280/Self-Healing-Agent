import { useState, useEffect } from "react";
import ServiceMap from "./ServiceMap";
import ReliabilityChart from "./ReliabilityChart";
import SystemLog from "./SystemLog";

// ── Diff Viewer ────────────────────────────────
function DiffViewer({ original, fixed }) {
  if (!original || !fixed) return null;

  let originalObj, fixedObj;
  try {
    originalObj = JSON.parse(original);
    fixedObj    = JSON.parse(fixed);
    console.log(originalObj)
    console.log(fixedObj)
  } catch {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-red-400 tracking-widest mb-2">BEFORE</div>
          <pre className="bg-red-400/5 border border-red-400/20 rounded p-3 text-xs text-red-300 overflow-auto">{original}</pre>
        </div>
        <div>
          <div className="text-xs text-green-400 tracking-widest mb-2">AFTER</div>
          <pre className="bg-green-400/5 border border-green-400/20 rounded p-3 text-xs text-green-300 overflow-auto">{fixed}</pre>
        </div>
      </div>
    );
  }

  const allKeys = [...new Set([...Object.keys(originalObj), ...Object.keys(fixedObj)])];

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 mb-1">
        <div className="text-xs text-red-400 tracking-widest">BEFORE</div>
        <div className="text-xs text-green-400 tracking-widest">AFTER</div>
      </div>
      <div className="border border-gray-800 rounded overflow-hidden">
        {allKeys.map((key) => {
          const changed = JSON.stringify(originalObj[key]) !== JSON.stringify(fixedObj[key]);
          return (
            <div key={key} className={`grid grid-cols-2 text-xs ${changed ? "bg-yellow-400/5" : ""}`}>
              <div className={`p-2 border-r border-b border-gray-800 ${changed ? "text-red-400" : "text-gray-600"}`}>
                <span className="text-gray-700">{key}: </span>
                {String(originalObj[key])}
              </div>
              <div className={`p-2 border-b border-gray-800 ${changed ? "text-green-400 font-bold" : "text-gray-600"}`}>
                <span className="text-gray-700">{key}: </span>
                {String(fixedObj[key])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    HEALED:         "border-emerald-500 text-emerald-500 bg-emerald-500/10",
    SELF_CORRECTED: "border-yellow-400 text-yellow-400 bg-yellow-400/10",
    BLOCKED:        "border-red-500 text-red-500 bg-red-500/10",
    CACHE_HIT:      "border-blue-400 text-blue-400 bg-blue-400/10",
  };
  return (
    <span className={`px-3 py-1 text-xs tracking-widest border rounded ${styles[status] || "border-gray-600 text-gray-400"}`}>
      {status}
    </span>
  );
}

// ── Docker Console ─────────────────────────────
function DockerConsole({ sandbox, status }) {
  if (status === "CACHE_HIT") {
    return (
      <div className="bg-black border border-gray-800 rounded p-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-xs text-blue-400 tracking-widest">
          CACHE HIT — Docker validation already passed for this incident
        </span>
      </div>
    );
  }

  if (!sandbox) return null;
  const lines = (sandbox.stdout || "").split("\n").filter(Boolean);

  return (
    <div className="bg-black border border-gray-800 rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${sandbox.passed ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="text-xs tracking-widest text-gray-500">
          DOCKER SANDBOX · exit code: {sandbox.exit_code}
        </span>
      </div>
      <div className="text-xs space-y-1">
        {lines.map((line, i) => (
          <div key={i} className={
            line.includes("PASSED") ? "text-emerald-400" :
            line.includes("FAILED") ? "text-red-400"     :
            line.includes("ERROR")  ? "text-red-400"     :
            line.startsWith("test_") ? "text-blue-400"   :
            "text-gray-600"
          }>
            {line}
          </div>
        ))}
        {sandbox.stderr && (
          <div className="text-red-400 mt-2">{sandbox.stderr}</div>
        )}
      </div>
    </div>
  );
}

// ── ROI Widget ─────────────────────────────────
function ROIWidget({ stats }) {
  if (!stats) return null;

  const items = [
    {
      label: "CACHE HITS",
      value: stats.cache_hits,
      sub: `$${stats.money_saved.toFixed(5)} saved`,
      color: "text-blue-400",
      border: "border-blue-400/20",
      bg: "bg-blue-400/5",
      icon: "⚡",
    },
    {
      label: "LLM CALLS",
      value: stats.llm_calls,
      sub: `$${stats.money_spent.toFixed(5)} spent`,
      color: "text-orange-400",
      border: "border-orange-400/20",
      bg: "bg-orange-400/5",
      icon: "🧠",
    },
    {
      label: "DOCKER RUNS",
      value: stats.docker_runs,
      sub: "sandboxed executions",
      color: "text-purple-400",
      border: "border-purple-400/20",
      bg: "bg-purple-400/5",
      icon: "🐳",
    },
    {
      label: "HALLUCINATIONS BLOCKED",
      value: stats.hallucinations_blocked,
      sub: "bad fixes caught",
      color: "text-red-400",
      border: "border-red-400/20",
      bg: "bg-red-400/5",
      icon: "🛡",
    },
  ];

  return (
    <div>
      <div className="text-xs tracking-widest text-gray-500 mb-4">
        ROI TRACKER
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded border ${item.border} ${item.bg} p-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{item.icon}</span>
              <span className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </span>
            </div>
            <div className={`text-xs font-bold tracking-widest ${item.color}`}>
              {item.label}
            </div>
            <div className="text-xs text-gray-700 mt-1">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Savings vs Spent bar */}
      <div className="mt-4 p-3 bg-slate-900 border border-gray-800 rounded">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">COST EFFICIENCY</span>
          <span className="text-emerald-400">
            {stats.money_spent > 0
              ? `${((stats.money_saved / (stats.money_saved + stats.money_spent)) * 100).toFixed(0)}% saved`
              : "0% saved"}
          </span>
        </div>
        <div className="h-2 bg-gray-900 rounded overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-700"
            style={{
              width: `${
                stats.money_saved + stats.money_spent > 0
                  ? (stats.money_saved / (stats.money_saved + stats.money_spent)) * 100
                  : 0
              }%`,
            }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-700"
            style={{
              width: `${
                stats.money_saved + stats.money_spent > 0
                  ? (stats.money_spent / (stats.money_saved + stats.money_spent)) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-emerald-400">
            saved ${stats.money_saved.toFixed(5)}
          </span>
          <span className="text-red-400">
            spent ${stats.money_spent.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
}
// ── Main App ───────────────────────────────────
export default function App() {

  const [domain,         setDomain]         = useState("DATA_PIPELINE");
  const [incidentType,   setIncidentType]   = useState("DATA_CRASH");
  const [sourceContent,  setSourceContent]  = useState("");
  const [errorSignature, setErrorSignature] = useState("");
  const [result,         setResult]         = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [failingService, setFailingService] = useState(null);
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [logs,           setLogs]           = useState([]);
  const [stats, setStats] = useState(null);
  
  // ── Add log line ───────────────────────────
  const addLog = (msg, type = "info") => {
    setLogs((prev) => [
      ...prev,
      { msg, type, ts: new Date().toLocaleTimeString() }
    ]);
  };
  const fetchStats = async () => {
  try {
    const res  = await fetch("http://localhost:5000/stats");
    const data = await res.json();
    setStats(data);
  } catch (e) {
    console.error("Stats fetch failed", e);
  }
};

// Add to useEffect that runs on mount
useEffect(() => {
  fetchLeaderboard();
  fetchStats();       // ← add this
}, []);

// Add fetchStats() call inside handleHeal after fetchLeaderboard()

  // ── Fetch leaderboard ──────────────────────
  const fetchLeaderboard = async () => {
    try {
      const res  = await fetch("http://localhost:5000/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard);
    } catch (e) {
      console.error("Leaderboard fetch failed", e);
    }
  };

  // Load leaderboard on mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // ── Heal handler ───────────────────────────
  const handleHeal = async () => {
    setLoading(true);
    setResult(null);
    setFailingService(null);

    addLog("Incident received — analyzing...", "info");
    addLog(`Domain: ${domain} | Type: ${incidentType}`, "info");
    console.log(sourceContent)
    console.log(errorSignature)
    try {
      const res = await fetch("http://localhost:5000/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          incident_type:   incidentType,
          source_content:  sourceContent,
          error_signature: errorSignature,
        }),
      });

      const data = await res.json();
      setResult(data);

      // ── Update service map ─────────────────
      if (data.failing_service) {
        setFailingService(data.failing_service);
        addLog(`Fault isolated → ${data.failing_service}`, "error");
      }

      // ── Log result ─────────────────────────
      if (data.status === "CACHE_HIT") {
        addLog("Cache hit — returning verified fix instantly", "cache");
      } else if (data.status === "HEALED") {
        addLog(`Healed on attempt ${data.attempt}`, "success");
        addLog(`Root cause: ${data.root_cause_logic}`, "ai");
      } else if (data.status === "SELF_CORRECTED") {
        addLog("Attempt 1 failed — self-correction triggered", "error");
        addLog(`Healed on attempt ${data.attempt}`, "success");
      } else if (data.status === "BLOCKED") {
        addLog("Both attempts failed — hallucination blocked", "error");
      }

      // ── Refresh leaderboard ────────────────
      await fetchLeaderboard();
      await fetchStats(); 

    } catch (e) {
      addLog(`Error: ${e.message}`, "error");
      setResult({ error: e.message });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-300 font-mono p-6">

      {/* ── Header ── */}
      <div className="mb-8 border-b border-gray-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-emerald-500">
            AUTONOMOUS HEAL
          </h1>
          <p className="text-xs text-gray-600 mt-1 tracking-widest">
            SELF-HEALING DATA PIPELINE · OBSERVABILITY DASHBOARD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 tracking-widest">LIVE</span>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* ── Left Column — Form ── */}
        <div className="col-span-1 space-y-6">

          {/* Domain Toggle */}
          <div>
            <label className="text-xs tracking-widest text-gray-500 mb-2 block">
              DOMAIN
            </label>
            <div className="flex flex-col gap-2">
              {["DATA_PIPELINE"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`px-4 py-2 text-xs tracking-widest border rounded transition-all text-left ${
                    domain === d
                      ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                      : "border-gray-700 text-gray-500 hover:border-gray-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Type */}
          <div>
            <label className="text-xs tracking-widest text-gray-500 mb-2 block">
              INCIDENT TYPE
            </label>
            <div className="flex flex-col gap-2">
              {["DATA_CRASH"].map((t) => (
                <button
                  key={t}
                  onClick={() => setIncidentType(t)}
                  className={`px-4 py-2 text-xs tracking-widest border rounded transition-all text-left ${
                    incidentType === t
                      ? "border-orange-400 text-orange-400 bg-orange-400/10"
                      : "border-gray-700 text-gray-500 hover:border-gray-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Source Content */}
          <div>
            <label className="text-xs tracking-widest text-gray-500 mb-2 block">
              SOURCE CONTENT
            </label>
            <textarea
              rows={6}
              value={sourceContent}
              onChange={(e) => setSourceContent(e.target.value)}
              placeholder={
                domain === "DATA_PIPELINE"
                  ? '{"fare_amount": -50.0, "trip_distance": 3.2, ...}'
                  : "def process(df):\n    return df['duration']"
              }
              className="w-full bg-slate-900 border border-gray-800 rounded p-3 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Error Signature */}

          {/* Heal Button */}
          <button
            onClick={handleHeal}
            disabled={loading || !sourceContent}
            className="w-full py-3 text-xs tracking-widest font-bold border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded"
          >
            {loading ? "HEALING..." : "▶ HEAL INCIDENT"}
          </button>

          {/* System Log */}
          <SystemLog logs={logs} />
        </div>

        {/* ── Middle Column — Results ── */}
        <div className="col-span-1 space-y-6">

          {result && !result.error && (
            <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={result.status} />
                <span className="text-xs text-gray-700 truncate ml-2">
                  {result.hash}
                </span>
              </div>

              {/* Diff */}
              <div>
                <div className="text-xs tracking-widest text-gray-500 mb-3">
                  DIFF
                </div>
                <DiffViewer
                  original={sourceContent}
                  fixed={result.result?.fixed_data}
                />
              </div>

              {/* Root Cause */}
              {result.root_cause_logic && (
                <div>
                  <div className="text-xs tracking-widest text-gray-500 mb-2">
                    ROOT CAUSE
                  </div>
                  <div className="bg-slate-900 border-l-2 border-emerald-500 p-4 text-sm text-gray-400 leading-relaxed">
                    {result.root_cause_logic}
                  </div>
                </div>
              )}

              {/* Strategy + Attempt */}
              <div className="flex gap-3">
                <div className="bg-slate-900 border border-gray-800 rounded px-4 py-2 text-xs">
                  <span className="text-gray-600">STRATEGY: </span>
                  <span className="text-orange-400">{result.result?.strategy}</span>
                </div>
                <div className="bg-slate-900 border border-gray-800 rounded px-4 py-2 text-xs">
                  <span className="text-gray-600">ATTEMPT: </span>
                  <span className="text-blue-400">{result.attempt}</span>
                </div>
              </div>

              {/* Docker Console */}
              <div>
                <div className="text-xs tracking-widest text-gray-500 mb-3">
                  DOCKER SANDBOX
                </div>
                <DockerConsole sandbox={result.sandbox} status={result.status} />
              </div>
            </>
          )}

          {result?.error && (
            <div className="p-4 border border-red-500/30 bg-red-500/5 rounded text-xs text-red-400">
              {result.error}
            </div>
          )}

          {!result && !loading && (
            <div className="h-48 flex items-center justify-center border border-gray-800 rounded text-xs text-gray-700 tracking-widest">
              AWAITING INCIDENT
            </div>
          )}
        </div>

        {/* ── Right Column — Observability ── */}
        <div className="col-span-1 space-y-6">
          <ServiceMap failingService={failingService} />
          <ReliabilityChart leaderboard={leaderboard} />
          <ROIWidget stats={stats} />  
        </div>
      </div>
    </div>
  );
}