const WALLETS = [
  { name: "Leather", icon: "L", color: "#f59e0b" },
  { name: "Xverse", icon: "X", color: "#6366f1" },
  { name: "Asigna", icon: "A", color: "#06b6d4" },
];

export function WalletModal({ isOpen, onClose, onConnect }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-4 text-center uppercase tracking-widest">Connect Wallet</h3>
        <div className="flex flex-col gap-2">
          {WALLETS.map((w) => (
            <button key={w.name} onClick={() => onConnect(w.name, `ST3EH...${Math.random().toString(36).slice(2, 6).toUpperCase()}`)}
              className="flex items-center gap-3 p-3 border border-slate-800 rounded-xl hover:border-slate-600 bg-slate-950/50 transition-all group">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black"
                style={{ background: `${w.color}15`, color: w.color, border: `1px solid ${w.color}40` }}>
                {w.icon}
              </span>
              <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{w.name}</span>
              <span className="ml-auto text-[10px] text-slate-500">Detected</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-[10px] text-slate-500 hover:text-white uppercase tracking-wider transition-colors">Cancel</button>
      </div>
    </div>
  );
}
