import { useState } from "react";

const NavBar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = () => {
    setIsConnected(true);
    setWalletAddress("ST3EH...3CQB9H");
  };

  return (
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

        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="relative group overflow-hidden bg-slate-950 text-white font-mono text-xs uppercase font-bold tracking-widest px-5 py-2.5 rounded border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connect Wallet
            </span>
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-md px-4 py-2 font-mono text-xs text-slate-300 flex items-center gap-2.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>{walletAddress}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;
