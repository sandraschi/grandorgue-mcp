import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "@/lib/nav";

const COLLAPSE_KEY = "grandorgue-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // storage unavailable: the toggle still works for this session
      }
      return !c;
    });
  };

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed}
      className={`${collapsed ? "w-16" : "w-56"} shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 transition-[width] duration-200`}
    >
      <div className="flex items-center gap-2 h-12 px-3 border-b border-zinc-800 shrink-0">
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-organ-gold/15 text-organ-gold font-serif text-lg ring-1 ring-organ-gold/30">
          GO
        </div>
        {!collapsed && (
          <span className="font-serif text-organ-gold tracking-wide truncate">GrandOrgue</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {collapsed ? (
              <div className="mx-3 mb-1 border-t border-zinc-800" aria-hidden="true" />
            ) : (
              <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  title={label}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-organ-gold/15 text-organ-gold font-medium"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-organ-gold" />
                      )}
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center gap-2 h-10 border-t border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
      >
        {collapsed ? (
          <PanelLeftOpen size={16} />
        ) : (
          <>
            <PanelLeftClose size={16} /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}
