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
  type LucideIcon,
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

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Extra words the command palette matches on. */
  keywords?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, topbar title and command palette. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "play",
    title: "Play",
    items: [
      { to: "/", icon: Monitor, label: "Dashboard", keywords: "home status start" },
      { to: "/console", icon: Music, label: "Console", keywords: "stops tutti keyboard play" },
      { to: "/visualizer", icon: Radio, label: "Visualizer", keywords: "pipes view" },
      { to: "/practice", icon: Music, label: "Practice", keywords: "studio learn score" },
      { to: "/midi-player", icon: Play, label: "Player", keywords: "midi bach play file" },
      { to: "/record", icon: Circle, label: "Record", keywords: "midi recorder capture" },
      { to: "/mixer", icon: Volume2, label: "Mixer", keywords: "audio volume levels" },
    ],
  },
  {
    id: "library",
    title: "Library",
    items: [
      { to: "/library", icon: Library, label: "Library", keywords: "organs sample sets installed" },
      {
        to: "/marketplace",
        icon: ShoppingBag,
        label: "Marketplace",
        keywords: "download sample sets catalog",
      },
      { to: "/midi-depot", icon: Disc, label: "MIDI Depot", keywords: "files bach catalog" },
      { to: "/combinations", icon: Layers, label: "Memory", keywords: "combination pistons" },
      {
        to: "/registrations",
        icon: Bookmark,
        label: "Registrations",
        keywords: "presets saved stops",
      },
      {
        to: "/assistant",
        icon: Sparkles,
        label: "Assistant",
        keywords: "ai registration suggest",
      },
    ],
  },
  {
    id: "agent",
    title: "Agent",
    items: [
      { to: "/inbox", icon: Inbox, label: "Inbox", keywords: "messages" },
      { to: "/chat", icon: MessagesSquare, label: "Chat", keywords: "llm talk" },
      { to: "/apps", icon: LayoutGrid, label: "Apps", keywords: "fleet hub" },
      { to: "/tools", icon: Wrench, label: "Tools", keywords: "mcp tools list" },
      { to: "/skills", icon: ListTodo, label: "Skills", keywords: "agent skills" },
    ],
  },
  {
    id: "system",
    title: "System",
    items: [
      { to: "/logs", icon: ScrollText, label: "Logs", keywords: "debug events" },
      { to: "/help", icon: HelpCircle, label: "Help", keywords: "docs troubleshooting" },
      { to: "/settings", icon: Settings, label: "Settings", keywords: "config midi ports path" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function titleForPath(pathname: string): string {
  const hit = NAV_ITEMS.find((i) => i.to === pathname);
  return hit ? hit.label : "";
}
