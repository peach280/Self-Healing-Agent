import { useEffect, useState } from "react";

const SERVICES = [
  { id: "Payment_Gateway",  icon: "💳", position: "top-left" },
  { id: "Driver_App_GPS",   icon: "📍", position: "top-right" },
  { id: "Distance Compute", icon: "🖥️", position: "bottom-left" },
  { id: "Promo_Engine",     icon: "🎟️", position: "bottom-right" },
];

export default function ServiceMap({ failingService }) {
  const [pulsing, setPulsing] = useState(null);

  // Pulse for 3 seconds when a service is blamed
  useEffect(() => {
    if (failingService) {
      setPulsing(failingService);
      const t = setTimeout(() => setPulsing(null), 3000);
      return () => clearTimeout(t);
    }
  }, [failingService]);

  return (
    <div>
      <div className="text-xs tracking-widest text-gray-500 mb-4">
        SERVICE MAP
      </div>

      {/* Grid of 4 nodes */}
      <div className="grid grid-cols-2 gap-4">
        {SERVICES.map((service) => {
          const isFailing = pulsing === service.id;

          return (
            <div
              key={service.id}
              className={`
                relative p-4 rounded border text-center transition-all duration-300
                ${isFailing
                  ? "border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  : "border-gray-800 bg-[#0C0E18]"
                }
              `}
            >
              {/* Pulse ring */}
              {isFailing && (
                <div className="absolute inset-0 rounded border-2 border-red-500 animate-ping opacity-30" />
              )}

              <div className="text-2xl mb-2">{service.icon}</div>
              <div className={`text-xs tracking-widest font-bold ${isFailing ? "text-red-400" : "text-gray-500"}`}>
                {service.id.replace("_", " ")}
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-1 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isFailing ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                <span className={`text-xs ${isFailing ? "text-red-400" : "text-gray-700"}`}>
                  {isFailing ? "FAULT" : "OK"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection lines label */}
      {failingService && (
        <div className="mt-3 text-center text-xs text-red-400 tracking-widest animate-pulse">
          ⚠ FAULT ISOLATED → {failingService.replace("_", " ")}
        </div>
      )}
    </div>
  );
}