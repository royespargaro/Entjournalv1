import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Search } from 'lucide-react';

// Setup categories as requested
const setupLibrary: Record<string, string[]> = {
    "ORDER BLOCKS": ["OB Bullish", "OB Bearish", "Breaker Block", "Mitigation Block"],
    "FAIR VALUE GAPS": ["FVG Bullish", "FVG Bearish", "IFVG"],
    "LIQUIDITY": ["Liquidity Sweep Long", "Liquidity Sweep Short", "Stop Hunt", "Equal Highs/Lows (EQH/EQL)"],
    "STRUCTURE": ["BOS Long", "BOS Short", "CHoCH Long", "CHoCH Short", "MSS"],
    "PATTERNS": ["OTE (61.8-79% fib)", "PD Arrays", "NWOG/NDOG", "Silver Bullet"],
    "OTHER": ["Planned Strategy", "News Trade", "Custom"]
};

// Auto-fill tags map
const setupTags: Record<string, string[]> = {
    "OB": ["OB", "SMC"],
    "FVG": ["FVG", "SMC"],
    "Liquidity": ["Liquidity", "Sweep"],
    "BOS": ["Structure", "SMC"],
    "CHoCH": ["Structure", "SMC"],
    "MSS": ["Structure", "SMC"],
    "OTE": ["OTE", "ICT", "Fib"]
};

export const SetupPicker = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (setup: string, tags: string[]) => void }) => {
    const [search, setSearch] = useState('');
    
    if (!isOpen) return null;

    const filteredSetups = Object.entries(setupLibrary).reduce((acc, [cat, list]) => {
        const filtered = list.filter(item => item.toLowerCase().includes(search.toLowerCase()));
        if (filtered.length > 0) acc[cat] = filtered;
        return acc;
    }, {} as Record<string, string[]>);

    const handleSelect = (setup: string) => {
        let tags: string[] = [];
        Object.entries(setupTags).forEach(([key, tagList]) => {
            if (setup.includes(key)) tags = [...new Set([...tags, ...tagList])];
        });
        onSelect(setup, tags);
        onClose();
    };

    return (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-spotify-card p-6 rounded-3xl w-full max-w-lg border border-white/10 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-white font-black uppercase tracking-widest text-lg">Pick Setup</h2>
                <button onClick={onClose} className="text-spotify-muted hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex items-center gap-2 bg-spotify-darker p-3 rounded-xl border border-white/5">
                <Search className="text-spotify-muted" size={16} />
                <input 
                  type="text" 
                  placeholder="Search setups..." 
                  className="bg-transparent text-white text-sm outline-none w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {Object.entries(filteredSetups).map(([cat, list]) => (
                    <div key={cat}>
                        <h3 className="text-spotify-muted text-[10px] font-black uppercase tracking-widest mb-2">{cat}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {list.map(setup => (
                                <button key={setup} onClick={() => handleSelect(setup)} className="text-left bg-white/5 hover:bg-spotify-green/20 p-3 rounded-xl text-white text-xs transition-colors">
                                    {setup}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </motion.div>
    )
}
