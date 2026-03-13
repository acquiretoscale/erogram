'use client';

import { useTaskManager } from './TaskManagerContext';

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

export default function TaskBar() {
  const { tasks, removeTask } = useTaskManager();

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-1.5 max-w-[340px] w-full pointer-events-none">
      {tasks.map(task => {
        const pct = task.total > 0 ? Math.round((task.done / task.total) * 100) : 0;
        const elapsed = Date.now() - task.startedAt;
        const isFinished = task.status !== 'running';
        const color = task.status === 'done' ? 'bg-green-500' : task.status === 'error' ? 'bg-red-500' : task.status === 'stopped' ? 'bg-amber-500' : 'bg-[#b31b1b]';
        const borderColor = task.status === 'done' ? 'border-green-500/30' : task.status === 'error' ? 'border-red-500/30' : task.status === 'stopped' ? 'border-amber-500/30' : 'border-white/10';

        return (
          <div
            key={task.id}
            className={`pointer-events-auto rounded-xl bg-[#151515] border ${borderColor} shadow-2xl shadow-black/60 px-3 py-2.5 transition-all ${
              isFinished ? 'opacity-70' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {!isFinished && (
                  <span className="w-3 h-3 border-2 border-[#b31b1b]/30 border-t-[#b31b1b] rounded-full animate-spin shrink-0" />
                )}
                {task.status === 'done' && <span className="text-green-400 text-xs shrink-0">✓</span>}
                {task.status === 'error' && <span className="text-red-400 text-xs shrink-0">✕</span>}
                {task.status === 'stopped' && <span className="text-amber-400 text-xs shrink-0">⏸</span>}
                <span className="text-[11px] text-white font-bold truncate">{task.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-[#999] tabular-nums">{formatElapsed(elapsed)}</span>
                {isFinished && (
                  <button onClick={() => removeTask(task.id)} className="text-[#555] hover:text-white transition-all p-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-[#999] tabular-nums font-bold w-[60px] text-right">
                {task.done}/{task.total}
              </span>
            </div>
            {task.error && (
              <div className="text-[10px] text-red-400 mt-1 truncate">{task.error}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
