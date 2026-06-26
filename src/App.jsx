import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { connect, disconnect } from "@stacks/connect";
import About from "./components/About";
import Hero from "./components/Hero";
import NavBar from "./components/Navbar";
import Features from "./components/Features";
import Story from "./components/Story";
import Contact from "./components/Contact";
import { FLOWVAULT_NETWORK } from "./editor/lib/config";

const EditorPage = lazy(() => import("./editor/EditorPage").then(m => ({ default: m.EditorPage })));

function App() {
  const [page, setPage] = useState(() => window.location.hash === "#editor" ? "editor" : "home");
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === "#editor" ? "editor" : "home");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const response = await connect({ network: FLOWVAULT_NETWORK, forceWalletSelect: true });
      setWalletAddress(response?.addresses?.[0]?.address || null);
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setWalletAddress(null);
  }, []);

  if (page === "editor") {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-emerald-400 font-mono text-sm animate-pulse">Loading Editor...</div>
        </div>
      }>
        <EditorPage walletAddress={walletAddress} onNavigateHome={() => window.location.hash = ""} />
      </Suspense>
    );
  }

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden">
      <NavBar walletAddress={walletAddress} onConnect={handleConnect} onDisconnect={handleDisconnect} />
      <Hero />
      <About />
      <Features />
      <Story />
      <Contact />
    </main>
  );
}

export default App;
