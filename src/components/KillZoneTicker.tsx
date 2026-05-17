import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';

const KillZoneTicker = () => {
  const [tickerText, setTickerText] = useState('');
  const [tickerStyle, setTickerStyle] = useState('');
  const [estTime, setEstTime] = useState('');

  useEffect(() => {
    const playPing = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    };

    let lastState: string | null = null;

    const tick = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const estOffset = -5;
      const estTime = new Date(utc + 3600000 * estOffset);
      const h = estTime.getHours();
      const m = estTime.getMinutes();
      const s = estTime.getSeconds();
      
      setEstTime(`EST ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

      const zones = [
        { name: 'Asian Kill Zone', start: 20, end: 24, color: 'blue' },
        { name: 'London Kill Zone', start: 2, end: 5, color: 'orange' },
        { name: 'NY AM Kill Zone', start: 8.5, end: 11, color: 'green' },
        { name: 'NY PM Kill Zone', start: 13.5, end: 16, color: 'green' },
        { name: 'Silver Bullet 1', start: 3, end: 4, color: 'purple' },
        { name: 'Silver Bullet 2', start: 10, end: 11, color: 'purple' },
        { name: 'Silver Bullet 3', start: 14, end: 15, color: 'purple' },
        { name: 'NY Lunch', start: 11.5, end: 13, color: 'red' },
      ];

      const timeInHours = h + m / 60;
      let activeZone = zones.find(z => timeInHours >= z.start && timeInHours < z.end);

      let text = '';
      let style = '';

      if (activeZone) {
        text = `🟢 ${activeZone.name} ACTIVE`;
        style = 'bg-[rgba(0,200,83,0.06)] border-[rgba(0,200,83,0.2)]';
        if (activeZone.name === 'NY Lunch') {
            text = `⛔ NY LUNCH — Avoid trading`;
            style = 'bg-[rgba(255,107,107,0.06)] border-[rgba(255,107,107,0.2)]';
        }
        if (lastState !== activeZone.name) {
            playPing();
            if (Notification.permission === 'granted') {
                new Notification(`⚡ ${activeZone.name} is now open. Check your setups.`);
            }
        }
        lastState = activeZone.name;
      } else {
        const nextZones = zones.map(z => ({
            ...z,
            diff: z.start - timeInHours < 0 ? (z.start - timeInHours + 24) : (z.start - timeInHours)
        })).sort((a,b) => a.diff - b.diff);
        
        const next = nextZones[0];
        const totalSecs = Math.floor(next.diff * 3600);
        const hR = Math.floor(totalSecs / 3600);
        const mR = Math.floor((totalSecs % 3600) / 60);
        const sR = totalSecs % 60;
        
        text = `⚡ ${next.name} opens in ${hR}h ${mR}m ${sR}s`;
        const colors: any = { blue: 'text-blue-400', orange: 'text-orange-400', green: 'text-emerald-400', purple: 'text-purple-400', red: 'text-red-400' };
        style = `border-white/6 ${colors[next.color]}`;
        lastState = null;
      }
      
      setTickerText(text);
      setTickerStyle(style);
    };

    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full h-[52px] bg-white/[0.02] border rounded-xl px-5 flex items-center justify-between my-4 ${tickerStyle}`}>
      <span className="text-xs font-bold tracking-wide">{tickerText}</span>
      <span className="font-mono text-[11px] text-white/30">{estTime}</span>
    </div>
  );
};

export default KillZoneTicker;
