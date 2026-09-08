import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import AudioMixer from "./components/AudioMixer";
import CombinationMemory from "./components/CombinationMemory";
import Dashboard from "./components/Dashboard";
import FloatingChat from "./components/FloatingChat";
import Marketplace from "./components/Marketplace";
import MidiDepot from "./components/MidiDepot";
import MidiPlayer from "./components/MidiPlayer";
import OrganBrowser from "./components/OrganBrowser";
import OrganConsole from "./components/OrganConsole";
import OrganVisualizer from "./components/OrganVisualizer";
import PracticeStudio from "./components/PracticeStudio";
import RecordPanel from "./components/RecordPanel";
import RegistrationAssistant from "./components/RegistrationAssistant";
import RegistrationManager from "./components/RegistrationManager";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { LoggerProvider } from "./context/LoggerContext";
import { useZoom } from "./hooks/useZoom";
import { AppsPage } from "./pages/apps";
import { ChatPage } from "./pages/ChatPage";
import { HelpPage } from "./pages/HelpPage";
import { InboxPage } from "./pages/InboxPage";
import { LogsPage } from "./pages/LogsPage";
import { SkillsPage } from "./pages/SkillsPage";
import { ToolsPage } from "./pages/ToolsPage";

export default function App() {
  useZoom();
  // Tauri desktop: listen for the backend-status event emitted by backend.rs
  // (health poll result). Falls back to HTTP polling in the dev browser —
  // Dashboard already polls /api/status every 3 s, this is only the push path.
  const [tauriBackend, setTauriBackend] = useState<string | null>(null);
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        const mod = await import("@tauri-apps/api/event");
        unlisten = await mod.listen<string>("backend-status", (e) => setTauriBackend(e.payload));
      } catch {
        // dev browser: @tauri-apps/api has no host — HTTP polling covers us
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
  void tauriBackend;
  return (
    <LoggerProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/console" element={<OrganConsole />} />
              <Route path="/library" element={<OrganBrowser />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/combinations" element={<CombinationMemory />} />
              <Route path="/record" element={<RecordPanel />} />
              <Route path="/registrations" element={<RegistrationManager />} />
              <Route path="/midi-depot" element={<MidiDepot />} />
              <Route path="/midi-player" element={<MidiPlayer />} />
              <Route path="/assistant" element={<RegistrationAssistant />} />
              <Route path="/mixer" element={<AudioMixer />} />
              <Route path="/visualizer" element={<OrganVisualizer />} />
              <Route path="/practice" element={<PracticeStudio />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
        <FloatingChat />
      </div>
    </LoggerProvider>
  );
}
