import { useEffect, useRef } from "react";

export default function SystemLog({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div>
      <div className="text-xs tracking-widest text-gray-500 mb-3">
        SYSTEM LOG
      </div>
      <div className="bg-black border border-gray-800 rounded p-4 h-48 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-700">
            Awaiting incidents...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`text-xs mb-1 ${
              log.type === "error"   ? "text-red-400"   :
              log.type === "success" ? "text-green-400" :
              log.type === "ai"      ? "text-blue-400"  :
              log.type === "cache"   ? "text-yellow-400":
              "text-gray-600"
            }`}>
              <span className="text-gray-700 mr-2">{log.ts}</span>
              {log.msg}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}