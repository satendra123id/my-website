const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const injection = `
      {/* AI API Work Tab */}
      {activeTab === 'ai_api_work' && (
        <div className="space-y-6 animate-fade-in" id="ai-api-work-content">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                AI System Dashboard
              </span>
              <h2 className="text-2xl font-black mt-3 text-white tracking-tight flex items-center gap-2">
                <Bot className="w-6 h-6 text-emerald-400" /> AI API Key Tracker
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {language === 'hi' ? 'सभी AI API Keys की स्थिति, लिमिट और उपयोग देखें।' : 'Monitor all AI API keys, their purpose, status, and limits.'}
              </p>
            </div>
            <button onClick={() => { /* re-fetch logic if needed */ }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Refresh Status
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#18181c] border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1">Master AI API Key (New)</h3>
                        <p className="text-emerald-400 text-xs font-mono mb-2">AQ.Ab8RN6IB9ZePxT-0Bo3qgzZa_QvVbPK5IbZtcqvwEFTAtqqbw</p>
                        <p className="text-zinc-400 text-sm">Tracks limits, handles fallback operations, and manages system API health.</p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">Active</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Limit Status</span>
                        <span className="text-white font-medium">Unlimited / Paid Tier</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Errors</span>
                        <span className="text-emerald-400 font-medium">0 Errors Recorded</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Last Used</span>
                        <span className="text-white font-medium">Just Now</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#18181c] border border-white/5 p-5 rounded-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1">Security Audit Key</h3>
                        <p className="text-zinc-400 text-sm">Used for system health check and finding vulnerabilities.</p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">Active (Fallback)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Limit Status</span>
                        <span className="text-white font-medium">1500 RPM (Free Tier)</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Errors</span>
                        <span className="text-zinc-400 font-medium">None</span>
                    </div>
                </div>
            </div>

            <div className="bg-[#18181c] border border-white/5 p-5 rounded-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1">Broken Link Fixer Key</h3>
                        <p className="text-zinc-400 text-sm">Auto-fixes broken video and attachment links via Google Search grounding.</p>
                    </div>
                    <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">Active (Rate Limited)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Limit Status</span>
                        <span className="text-amber-400 font-medium">Quota Exceeded / Free Tier</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Errors</span>
                        <span className="text-red-400 font-medium">Auto-fix Failed</span>
                    </div>
                    <div className="w-full mt-2">
                         <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                             <p className="text-amber-400 text-xs">ℹ️ This key reached its free tier limit. The Master AI Key is now handling auto-fix fallback automatically.</p>
                         </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#18181c] border border-white/5 p-5 rounded-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-1">Chat Support & Course Generator Keys</h3>
                        <p className="text-zinc-400 text-sm">Powers the real-time student AI chat assistant and AI course generation tools.</p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">Active (Fallback)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Limit Status</span>
                        <span className="text-white font-medium">1500 RPM (Free Tier)</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase tracking-wider mb-1">Errors</span>
                        <span className="text-zinc-400 font-medium">None</span>
                    </div>
                </div>
            </div>
            
          </div>
        </div>
      )}
`;

code = code.replace('{/* Render the Preview Modal if active */}', injection + '\n      {/* Render the Preview Modal if active */}');
fs.writeFileSync('src/components/AdminPortal.tsx', code);
