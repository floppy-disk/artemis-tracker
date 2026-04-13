# Artemis II Tracker

> **Archived Project** — This project was retired on April 13, 2026. The live site remains available as a frozen snapshot with data last updated on April 10, 2026 (Mission Day 10). The automated AI update pipeline and deployment workflows have been disabled. No further updates will be made.

A real-time, AI-powered mission tracker for NASA's Artemis II lunar flyby. This project provides a visually immersive dashboard that automatically stays up-to-date with the latest mission news, telemetry, and milestones using Google's Gemini AI.

## 🚀 How It Works

This is a **serverless, automated tracker** that functions through a coordinated flow between a static frontend and an AI-driven background process:

### 1. The Frontend (React + Vite)
- **Real-Time Dashboard:** Displays a Mission Elapsed Time (MET) clock, progress bar, and mission stats.
- **Dynamic Polling:** The browser automatically polls a static `public/data.json` file every minute to ensure the UI stays updated without a page refresh.
- **Visuals:** Features a procedural starfield and high-contrast, mission-control inspired UI elements.

### 2. The AI Update Engine (Node.js + Gemini)
- **Discovery:** A script (`scripts/fetch-updates.js`) uses Google's Gemini Pro with Google Search to find the absolute latest news regarding Artemis II.
- **Structuring:** The AI takes raw search results and converts them into a strict, validated JSON schema that the frontend understands.
- **Milestone Management:** The script intelligently merges new AI-discovered events with existing mission milestones.

### 3. Automation (GitHub Actions)
- **Fixed Schedule:** A GitHub Action (`.github/workflows/tracker-update.yml`) runs the AI update engine once every hour.
- **Data Persistence:** After fetching new data, the Action automatically commits the updated `data.json` back to the repository, which triggers a new deployment to GitHub Pages.

---

## 🛠 Tech Stack

- **Frontend:** React, Vite, CSS-in-JS (Vanilla styles).
- **AI:** Google Gemini API (Pro & Flash models).
- **Automation:** GitHub Actions.
- **Deployment:** GitHub Pages.
- **Data:** Flat-file JSON database.

---

## 💻 Local Development

### Prerequisites
- Node.js (v20+)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (or set your environment variable):
   ```bash
   GEMINI_API_KEY=your_key_here
   ```

### Running the App
```bash
npm run dev
```

### Manually Fetching Updates
To test the AI discovery locally:
```bash
node scripts/fetch-updates.js
```

---

## 🛰 Mission Details
- **Crew:** Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen.
- **Duration:** ~10 Days.
- **Distance:** ~685,000 miles.
- **Launch Date:** April 1, 2026.

---

## 🤖 AI Contributions

This project was originally built with **Google Gemini CLI**. During development, Gemini produced Timeline font colors with poor contrast against the dark background, resulting in nearly unreadable text. **Claude Opus 4.6** was used to diagnose the contrast issues and devise a fix that boosted the muted teal-gray palette while preserving the space aesthetic.

**Claude Opus 4.6** also fixed a timeline hallucination bug where the Gemini-powered update engine injected real-world NASA schedule dates into the simulation's timeline. The AI found news about actual Artemis II delays (late 2026 launch) and appended them as new milestones, producing impossible Day -723 and Day 244 entries. The fix restored the missing `launch` milestone in `data.json` and added a date-range guard in `fetch-updates.js` that rejects any new milestone with a date before launch or more than 30 days after.
