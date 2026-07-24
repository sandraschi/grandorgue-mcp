import { Route, Routes } from "react-router-dom";
import { useZoom } from "./hooks/useZoom";
import AudioMixer from "./components/AudioMixer";
import CombinationMemory from "./components/CombinationMemory";
import Dashboard from "./components/Dashboard";
import Marketplace from "./components/Marketplace";
import MidiDepot from "./components/MidiDepot";
import MidiPlayer from "./components/MidiPlayer";
import OrganBrowser from "./components/OrganBrowser";
import OrganConsole from "./components/OrganConsole";
import RecordPanel from "./components/RecordPanel";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import FloatingChat from "./components/FloatingChat";

export default function App() {
  useZoom();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/console" element={<OrganConsole />} />
            <Route path="/library" element={<OrganBrowser />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/combinations" element={<CombinationMemory />} />
            <Route path="/record" element={<RecordPanel />} />
            <Route path="/midi-depot" element={<MidiDepot />} />
            <Route path="/midi-player" element={<MidiPlayer />} />
            <Route path="/mixer" element={<AudioMixer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
