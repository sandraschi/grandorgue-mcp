interface StopDef {
  name: string;
  cc: number;
  manual: string;
  isTrem?: boolean;
}

interface Props {
  stops: StopDef[];
  stopState: Record<number, boolean>;
  onToggle: (cc: number) => void;
}

export default function StopPanel({ stops, stopState, onToggle }: Props) {
  const manuals = [...new Set(stops.map((s) => s.manual))];

  return (
    <div className="flex gap-6 flex-wrap">
      {manuals.map((manual) => (
        <div key={manual} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
          <h3 className="text-xs text-zinc-500 mb-2 font-medium">{manual}</h3>
          <div className="flex gap-2 flex-wrap">
            {stops
              .filter((s) => s.manual === manual)
              .map((stop) => (
                <button
                  key={stop.cc}
                  onClick={() => onToggle(stop.cc)}
                  className={`stop-tab ${stopState[stop.cc] ? "stop-tab-on" : "stop-tab-off"}`}
                >
                  <span className="writing-vertical-rl rotate-180">{stop.name}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
