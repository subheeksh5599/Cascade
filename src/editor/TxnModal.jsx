const NODE_COLORS = { lock: "#f59e0b", split: "#6366f1", hold: "#06b6d4" };

export function TxnModal({ isOpen, onClose, onConfirm, graph, depositAmount }) {
  if (!isOpen) return null;
  const totalNodes = graph.nodes.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-[400px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-1 text-center uppercase tracking-widest">Execute Cascade</h3>
        <p className="text-[10px] text-slate-500 text-center mb-4">Review the transaction chain before confirming</p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 text-center">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Root Deposit</div>
          <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            {Number(depositAmount).toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">USDCx</div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {graph.nodes.map((n, i) => (
            <div key={n.id} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                style={{ background: `${NODE_COLORS[n.type]}15`, color: NODE_COLORS[n.type], border: `1px solid ${NODE_COLORS[n.type]}30` }}>
                {n.type[0].toUpperCase()}
              </span>
              <span className="text-xs text-slate-300 truncate">{n.label}</span>
              <span className="text-[9px] text-slate-600 ml-auto">{n.type}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 text-center text-[10px]">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
            <div className="text-slate-500">Nodes</div>
            <div className="text-white font-bold">{totalNodes}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
            <div className="text-slate-500">Edges</div>
            <div className="text-white font-bold">{graph.edges.length}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
            <div className="text-slate-500">Txn Depth</div>
            <div className="text-white font-bold">{totalNodes}</div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 mb-4">
          Estimated gas: <span className="text-white font-mono">~{(totalNodes * 0.012).toFixed(4)} STX</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all uppercase tracking-wider">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
