{
  "name": "entj-trading-journal",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "esbuild": "^0.25.0",
    "tsx": "^4.19.3",
    "@firebase/eslint-plugin-security-rules": "^0.0.2",
    "@types/node": "^22.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.39.4",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2"
  },
  "dependencies": {
    "@google/genai": "^1.52.0",
    "@google/generative-ai": "^0.24.1",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.12.1",
    "groq-sdk": "^1.2.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "papaparse": "^5.5.3",
    "qrcode.react": "^4.2.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-markdown": "^10.1.0",
    "recharts": "^3.8.1",
    "vite": "^6.2.3",
    "xlsx": "^0.18.5"
  }
}
