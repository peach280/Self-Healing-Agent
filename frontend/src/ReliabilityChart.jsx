export default function ReliabilityChart({ leaderboard }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div>
        <div className="text-xs tracking-widest text-gray-500 mb-4">
          RELIABILITY LEADERBOARD
        </div>
        <div className="text-xs text-gray-700 text-center py-8">
          No heals recorded yet
        </div>
      </div>
    );
  }

  const max = Math.max(...leaderboard.map((s) => s.heals), 1);

  const colors = {
    Payment_Gateway:  "bg-red-500",
    Driver_App_GPS:   "bg-orange-500",
    Central_Dispatch: "bg-yellow-500",
    Promo_Engine:     "bg-purple-500",
  };

  return (
    <div>
      <div className="text-xs tracking-widest text-gray-500 mb-4">
        RELIABILITY LEADERBOARD
      </div>

      <div className="space-y-3">
        {leaderboard.map((item) => (
          <div key={item.service}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">
                {item.service.replace("_", " ")}
              </span>
              <span className="text-gray-600">
                {item.heals} {item.heals === 1 ? "heal" : "heals"}
              </span>
            </div>
            <div className="h-2 bg-gray-900 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-700 ${colors[item.service] || "bg-emerald-500"}`}
                style={{ width: `${(item.heals / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}