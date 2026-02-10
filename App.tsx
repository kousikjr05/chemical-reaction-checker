import React, { useState } from 'react';
import { ChemicalInput } from './components/ChemicalInput';
import { ResultCard } from './components/ResultCard';
import { ReactionResult, Chemical } from './types';
import { normalizeInput, checkReaction } from './services/chemicalService';

const App: React.FC = () => {
  const [chem1, setChem1] = useState('');
  const [chem2, setChem2] = useState('');
  const [result, setResult] = useState<ReactionResult | null>(null);
  const [history, setHistory] = useState<ReactionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setError(null);
    if (!chem1.trim() || !chem2.trim()) {
      setError('Provide two chemicals.');
      return;
    }

    setIsLoading(true);
    try {
      // usage of normalizeInput here is redundant as checkReaction handles it, 
      // but keeping it if we wanted to show normalized names in UI could be useful. 
      // However, checkReaction now returns 'chemicals' array which we use for history.

      const res = await checkReaction(chem1, chem2);
      setResult(res);
      setHistory(prev => [res, ...prev.slice(0, 3)]);
    } catch (err) {
      setError('Safety check failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const GlassIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m4.93 4.93 14.14 14.14" /><path d="M2 12h20" /><path d="m4.93 19.07 14.14-14.14" /></svg>
  );

  return (
    <div className="min-h-screen flex flex-col relative">

      <div className="flex-grow max-w-5xl mx-auto px-6 py-16 w-full relative z-10">
        {/* Header Section */}
        <header className="text-center mb-16">
          <div className="flex justify-center mb-10">
            <div className="w-24 h-24 glass-card rounded-[2rem] flex items-center justify-center shadow-2xl animate-float">
              <span className="text-6xl drop-shadow-xl">🧪</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight mb-4">
            Safety <span className="text-sky-500">Checker</span>
          </h1>
          <p className="text-sm text-slate-400 font-black uppercase tracking-[0.4em]">
            Interactive Lab Safety
          </p>
        </header>

        {/* Main Content Area */}
        <main className="space-y-12">

          {/* Main Glass Input Card */}
          <section className="glass-card p-10 md:p-16 rounded-[3.5rem] shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full mb-12">
              <ChemicalInput
                label="Component One"
                value={chem1}
                onChange={setChem1}
                onSelect={(c) => setChem1(c.name)}
                icon={<GlassIcon />}
              />
              <ChemicalInput
                label="Component Two"
                value={chem2}
                onChange={setChem2}
                onSelect={(c) => setChem2(c.name)}
                icon={<GlassIcon />}
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCheck}
                disabled={isLoading}
                className="glass-btn w-full md:w-auto md:px-20 py-6 rounded-[1.5rem] font-black text-white text-xl flex items-center justify-center gap-4 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Evaluating...
                  </span>
                ) : 'Run Analysis'}
              </button>
            </div>

            {error && (
              <div className="mt-8 text-center">
                <p className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] bg-white/50 backdrop-blur-md px-6 py-2 rounded-full border border-red-200 inline-block">
                  {error}
                </p>
              </div>
            )}
          </section>

          {/* Result View */}
          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <ResultCard result={result} />
            </div>
          )}

          {/* Simple Log History */}
          {history.length > 1 && (
            <section className="pt-12">
              <div className="flex items-center gap-6 mb-10">
                <div className="h-px flex-grow bg-slate-200/50"></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Log History</h3>
                <div className="h-px flex-grow bg-slate-200/50"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.slice(1).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setResult(item)}
                    className="glass-card hover:bg-white/40 p-6 rounded-[2rem] flex flex-col gap-4 cursor-pointer transition-all hover:-translate-y-2 group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-700 leading-tight truncate">
                        {item.chemicals[0]} + {item.chemicals[1]}
                      </span>
                      <span
                        className="w-3 h-3 rounded-full shadow-lg"
                        style={{ backgroundColor: (item.type === 'Safe' ? 'var(--safe)' : item.type === 'Mild' ? 'var(--mild)' : item.type === 'Exothermic' ? 'var(--exo)' : item.type === 'Dangerous' ? 'var(--danger)' : 'var(--extreme)') }}
                      ></span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{item.type}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Simplified Footer */}
      <footer className="mt-24 w-full py-16 px-6 relative z-10 backdrop-blur-xl border-t border-white/40">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-base text-slate-600 font-bold tracking-tight">
            "For educational purposes only. Not for laboratory or industrial use."
          </p>
          <div className="flex justify-center items-center pt-2">
            <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-[0.4em] px-6 py-2 bg-slate-800/5 rounded-full">
              &copy; 2026 Copyrighted
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;