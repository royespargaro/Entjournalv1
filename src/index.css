@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  
  --color-spotify-green: #1DB954;
  --color-spotify-green-hover: #1ED760;
  --color-spotify-black: #121212;
  --color-spotify-darker: #000000;
  --color-spotify-card: #181818;
  --color-spotify-card-hover: #282828;
  --color-spotify-muted: #B3B3B3;
  --color-spotify-light: #FFFFFF;
}

@layer base {
  body {
    @apply bg-spotify-black text-spotify-light font-sans antialiased selection:bg-spotify-green selection:text-black;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-white/10 rounded-full hover:bg-white/20 transition-colors;
  }
}

.spotify-gradient {
  background: linear-gradient(180deg, rgba(29, 185, 84, 0.15) 0%, rgba(18, 18, 18, 1) 100%);
}

.text-glow {
  text-shadow: 0 0 20px rgba(29, 185, 84, 0.5);
}

.text-glow-sm {
  text-shadow: 0 0 10px rgba(29, 185, 84, 0.3);
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.markdown-analysis h1, .markdown-analysis h2, .markdown-analysis h3 {
  @apply font-black tracking-tight text-white mb-2 mt-4 first:mt-0 uppercase;
}

.markdown-analysis h1 { @apply text-base tracking-widest text-spotify-green; }
.markdown-analysis h2 { @apply text-sm tracking-widest text-spotify-green/80; }
.markdown-analysis h3 { @apply text-xs tracking-[0.2em] text-spotify-green/60; }

.markdown-analysis p {
  @apply mb-3 last:mb-0 text-white/70;
}

.markdown-analysis ul, .markdown-analysis ol {
  @apply mb-3 space-y-1.5 list-outside ml-4;
}

.markdown-analysis ul { @apply list-disc; }
.markdown-analysis ol { @apply list-decimal; }

.markdown-analysis li {
  @apply pl-1;
}

@keyframes impulse-green {
  0%, 100% { box-shadow: 0 0 0px rgba(29, 185, 84, 0); border-color: rgba(29, 185, 84, 0.2); }
  50% { box-shadow: 0 0 15px rgba(29, 185, 84, 0.6); border-color: rgba(29, 185, 84, 0.8); }
}
@keyframes impulse-red {
  0%, 100% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); border-color: rgba(239, 68, 68, 0.8); }
}

.impulse-green {
  animation: impulse-green 1.2s infinite ease-in-out;
}

.impulse-red {
  animation: impulse-red 1.2s infinite ease-in-out;
}
