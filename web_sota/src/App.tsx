import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./components/Dashboard";
import OrganConsole from "./components/OrganConsole";
import OrganBrowser from "./components/OrganBrowser";
import CombinationMemory from "./components/CombinationMemory";
import RecordPanel from "./components/RecordPanel";
import AudioMixer from "./components/AudioMixer";
import Marketplace from "./components/Marketplace";

export default function App() {
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
            <Route path="/mixer" element={<AudioMixer />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
