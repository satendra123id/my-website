const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const injectionState = `  const [aiApiKeysStatus, setAiApiKeysStatus] = useState<any[]>([]);
  const [loadingAiKeys, setLoadingAiKeys] = useState(false);

  const fetchAiApiStatus = async () => {
    setLoadingAiKeys(true);
    try {
      const res = await fetch('/api/admin/ai-api-status');
      const data = await res.json();
      if (data.success) {
        setAiApiKeysStatus(data.keys);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingAiKeys(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai_api_work') {
      fetchAiApiStatus();
    }
  }, [activeTab]);
`;

code = code.replace("  // Email Trigger Simulator State", injectionState + "\n  // Email Trigger Simulator State");

const injectionTab = `      {/* AI API Work Tab */}
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
            <button onClick={fetchAiApiStatus} disabled={loadingAiKeys} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50">
              <RotateCcw className={\`w-4 h-4 \${loadingAiKeys ? 'animate-spin' : ''}\`} /> Refresh Status
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {aiApiKeysStatus.map((keyInfo: any) => (
                <div key={keyInfo.id} className={\`\${keyInfo.id === 'aiApiWork' ? 'bg-[#18181c] border-emerald-500/20' : 'bg-[#18181c] border-white/5'} border p-5 rounded-3xl relative overflow-hidden\`}>
                    {keyInfo.id === 'aiApiWork' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-1">{keyInfo.name}</h3>
                            <p className="text-zinc-400 text-sm">{keyInfo.purpose}</p>
                        </div>
                        <span className={\`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border \${keyInfo.status.includes('Error') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}\`}>{keyInfo.status}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm">
                        <div>
                            <span className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Limit Status</span>
                            <span className="text-white font-medium text-xs">{keyInfo.limit}</span>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <span className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Errors</span>
                            <span className={\`font-medium text-xs \${keyInfo.errors !== 'None' ? 'text-red-400 break-all' : 'text-zinc-400'}\`}>{keyInfo.errors}</span>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}`;

// find the exact block to replace for the tab content
const startMarkerTab = `      {/* AI API Work Tab */}`;
const endMarkerTab = `      {/* Render the Preview Modal if active */}`;

const startIndexTab = code.indexOf(startMarkerTab);
const endIndexTab = code.indexOf(endMarkerTab);

if (startIndexTab !== -1 && endIndexTab !== -1) {
    code = code.substring(0, startIndexTab) + injectionTab + "\n" + code.substring(endIndexTab);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Successfully replaced AdminPortal.tsx tab block");
} else {
    console.log("Could not find tab markers in AdminPortal.tsx");
}
