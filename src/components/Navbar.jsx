import { useState } from "react";

const WALLETS = [
  { name: "Leather", icon: "L", color: "#f59e0b" },
  { name: "Xverse", icon: "X", color: "#6366f1" },
  { name: "Asigna", icon: "A", color: "#06b6d4" },
];

const NavBar = ({ walletAddress, onConnect, onDisconnect }) => {
  const [showModal, setShowModal] = useState(false);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 text-center uppercase tracking-widest">Connect Wallet</h3>
            <div className="flex flex-col gap-2">
              {WALLETS.map((w) => (
                <button key={w.name} onClick={() => { setShowModal(false); onConnect(); }}
                  className="flex items-center gap-3 p-3 border border-slate-800 rounded-xl hover:border-slate-600 bg-slate-950/50 transition-all group">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: `${w.color}15`, color: w.color, border: `1px solid ${w.color}40` }}>
                    {w.icon}
                  </span>
                  <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{w.name}</span>
                  <span className="ml-auto text-[10px] text-slate-500">Select</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowModal(false)} className="mt-4 w-full text-[10px] text-slate-500 hover:text-white uppercase tracking-wider transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <header className="absolute top-0 left-0 w-full px-8 py-5 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-black tracking-tight text-white uppercase no-underline">
            CASCADE<span className="text-emerald-400">.</span>
          </a>
          <span className="hidden sm:inline-block bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-widest text-slate-400">
            Testnet Engine
          </span>
        </div>

        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-slate-400">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>

          {!walletAddress ? (
            <button onClick={() => setShowModal(true)}
              className="relative group overflow-hidden bg-slate-950 text-white font-mono text-xs uppercase font-bold tracking-widest px-5 py-2.5 rounded border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connect Wallet
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-md px-4 py-2 font-mono text-xs text-slate-300 flex items-center gap-2.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>{shortAddr}</span>
              </div>
              <button onClick={onDisconnect}
                className="text-[9px] text-slate-500 hover:text-red-400 uppercase tracking-wider transition-colors font-mono">
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default NavBar;
