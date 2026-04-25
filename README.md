# Zai Warehouse Intelligence — Frontend  

 TRY OUR APP : https://zai-1054928413411.asia-southeast1.run.app/  


<img width="300" height="300" alt="qr" src="https://github.com/user-attachments/assets/86e34ab1-e307-47a3-95e9-d0e7803ae6d2" />


The frontend for **Zai**, an AI-powered warehouse intelligence dashboard built for the CISN hackathon. It provides a single-pane interface for warehouse operators to chat with an AI assistant, monitor live bin capacity, track product velocity, and navigate the physical warehouse layout.

## What's inside

The app is a single-page React application with four main views:

- **Intelligence** — A chat interface backed by Google Gemini. Operators ask natural-language questions about inventory ("has the new shipment arrived?", "where is product X?") and receive grounded answers from the live database.
- **Capacity** — Real-time bin occupancy matrix across all aisles, shelves, and levels. Bins are color-coded by fill percentage, flagged when blocked, and reveal their contents on hover.
- **Velocity** — Sales throughput analytics with bar charts and per-product growth deltas, computed live from the backend's velocity feed.
- **Grid** — A visual directory of the warehouse floor plan (aisles A1–A3, 54 bins) so staff can locate stock spatially.

The dashboard polls the backend every 5 seconds to keep inventory and sales data in sync, and a collapsible sidebar tracks recent chat sessions.

## Tech stack

- **React 19** + **TypeScript** + **Vite** for the build/dev toolchain
- **Tailwind CSS v4** for styling, with a custom dark glassmorphism theme
- **Motion** (Framer Motion) for transitions and entrance animations
- **Recharts** for the velocity bar charts
- **Lucide React** for iconography
- **@google/genai** for the Gemini chat integration

## Getting started

```bash
npm install
npm run dev      # starts Vite on http://localhost:3000
npm run build    # production bundle
npm run lint     # type-checks via tsc --noEmit
```

Copy `.env.example` to `.env` and set `VITE_API_BASE` if your backend isn't running on `http://localhost:8080`. In production (Cloud Run), the frontend is served from the same origin as `/api`, so no override is needed.

## Project layout

```
Frontend/
├── src/
│   ├── App.tsx              # main UI + all four views
│   ├── main.tsx             # React entry point
│   ├── index.css            # Tailwind + global styles
│   └── services/
│       └── GeminiService.ts # Gemini API wrapper
├── index.html
├── vite.config.ts
└── package.json
```

