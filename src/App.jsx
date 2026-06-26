import { useState, useCallback, useEffect } from "react";
import { connect, disconnect } from "@stacks/connect";
import About from "./components/About";
import Hero from "./components/Hero";
import NavBar from "./components/Navbar";
import Features from "./components/Features";
import Story from "./components/Story";
import Contact from "./components/Contact";
import { EditorPage } from "./editor/EditorPage";
import { FLOWVAULT_NETWORK } from "./editor/lib/config";

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
    return <EditorPage walletAddress={walletAddress} onNavigateHome={() => window.location.hash = ""} />;
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
