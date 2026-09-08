import {
  Bookmark,
  Circle,
  Disc,
  HelpCircle,
  Inbox,
  Layers,
  LayoutGrid,
  Library,
  ListTodo,
  MessagesSquare,
  Monitor,
  Music,
  Play,
  Radio,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  Volume2,
  Wrench,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", icon: Monitor, label: "Dashboard" },
  { to: "/inbox", icon: Inbox, label: "Inbox" },
  { to: "/console", icon: Music, label: "Console" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
  { to: "/combinations", icon: Layers, label: "Memory" },
  { to: "/record", icon: Circle, label: "Record" },
  { to: "/registrations", icon: Bookmark, label: "Registrations" },
  { to: "/midi-depot", icon: Disc, label: "MIDI Depot" },
  { to: "/midi-player", icon: Play, label: "Player" },
  { to: "/mixer", icon: Volume2, label: "Mixer" },
  { to: "/assistant", icon: Sparkles, label: "Assistant" },
  { to: "/visualizer", icon: Radio, label: "Visualizer" },
  { to: "/practice", icon: Music, label: "Practice" },
  { to: "/chat", icon: MessagesSquare, label: "Chat" },
  { to: "/apps", icon: LayoutGrid, label: "Apps" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/skills", icon: ListTodo, label: "Skills" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
  { to: "/help", icon: HelpCircle, label: "Help" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-16 flex flex-col items-center gap-1 py-3 bg-zinc-900 border-r border-zinc-800">
      <div className="mb-3 mt-1 text-organ-gold text-xl font-serif">GO</div>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `p-2 rounded-lg transition-colors ${isActive ? "bg-organ-gold/20 text-organ-gold" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"}`
          }
          title={label}
        >
          <Icon size={20} />
        </NavLink>
      ))}
    </aside>
  );
}
