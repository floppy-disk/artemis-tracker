/* global process */
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { calculateMissionDay } from '../src/validation.js';

const dataPath = path.join(__dirname, '../public/data.json');

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["nominal", "caution", "warning", "emergency"], description: "Overall mission status" },
    statusLabel: { type: Type.STRING, description: "Short 1-3 word phrase for the status badge" },
    currentPhase: { type: Type.STRING, description: "Brief description of current mission phase" },
    headline: { type: Type.STRING, description: "1 sentence primary headline of latest news" },
    details: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-4 bullet points of details" },
    crewStatus: { type: Type.STRING, nullable: true, description: "Brief update on the crew" },
    telemetry: {
      type: Type.OBJECT,
      properties: {
        distanceFromEarth: { type: Type.NUMBER, nullable: true, description: "Current distance from Earth in km" },
        distanceFromMoon: { type: Type.NUMBER, nullable: true, description: "Current distance from Moon in km" },
        velocity: { type: Type.NUMBER, nullable: true, description: "Current velocity in km/h" },
        missionElapsedDay: { type: Type.NUMBER, nullable: true, description: "Current mission day (integer)" }
      },
      description: "Current numeric mission statistics"
    },
    alertMessage: { type: Type.STRING, nullable: true, description: "Only used for warnings or emergencies" },
    sources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sources for the news" },
    lastEvent: { type: Type.STRING, nullable: true, description: "Description of the last completed major event" },
    nextEvent: { type: Type.STRING, nullable: true, description: "Description of the next upcoming major event" },
    milestoneUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Milestone ID (e.g. launch, tli, lunar-flyby)" },
          label: { type: Type.STRING, description: "Display label for new milestones" },
          completed: { type: Type.BOOLEAN, description: "Whether it has completed" },
          completedTime: { type: Type.STRING, nullable: true, description: "ISO 8601 string of completion (include time zone offset or Z)" },
          updatedTime: { type: Type.STRING, nullable: true, description: "ISO 8601 string of newly estimated time (include time zone offset or Z)" },
          updatedDetail: { type: Type.STRING, nullable: true, description: "Brief 1-sentence description/context for the milestone" },
          day: { type: Type.NUMBER, nullable: true, description: "Mission day (for new milestones only)" },
          icon: { type: Type.STRING, nullable: true, description: "Emoji icon (for new milestones only)" }
        },
        required: ["id", "completed"]
      },
      description: "Updates to known milestones or brand new milestones discovered in the news"
    }
  },
  required: ["status", "statusLabel", "currentPhase", "headline", "details", "sources"]
};

async function generateWithFallback(params, models = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview']) {
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await ai.models.generateContent({
        ...params,
        model: model
      });
    } catch (err) {
      const isLast = i === models.length - 1;
      const isRetryable = err.status === 'UNAVAILABLE' || (err.message && err.message.includes("503"));
      
      if (isRetryable && !isLast) {
        console.warn(`Model ${model} is unavailable. Falling back to ${models[i+1]}...`);
        continue;
      }
      throw err;
    }
  }
}

async function fetchNews(existingMilestones = []) {
  console.log("Step 1: Searching for latest Artemis II news...");
  const launchTime = "2026-04-01T22:35:00Z";
  const searchPrompt = `Search for the absolute latest news regarding the NASA Artemis II mission (launched ${launchTime}). 
  Focus on: current mission status, crew health, and any milestones recently reached or upcoming soon. 
  Include numeric factual values if available (distance, velocity).
  Today's date/time is ${new Date().toISOString()}.
  Mission Day 1: April 1 22:35Z to April 2 22:35Z
  Mission Day 2: April 2 22:35Z to April 3 22:35Z
  Mission Day 3: April 3 22:35Z to April 4 22:35Z`;

  const searchResponse = await generateWithFallback({
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  const rawInfo = searchResponse.text;
  console.log("Step 2: Formatting search results into JSON...");

  const milestonesList = existingMilestones.map(m => `- ${m.label} (ID: ${m.id}, Time: ${m.time})`).join("\n");

  const formatPrompt = `Based on the following mission information, generate a briefing in strict JSON format.
  
  MISSION INFO: ${rawInfo}
  
  Existing Milestones:
  ${milestonesList}
  
  Rules:
  1. Status must be "nominal", "caution", "warning", or "emergency".
  2. milestoneUpdates can include known IDs: launch, core-sep, solar-deploy, perigee-raise, tli, icps-sep, prox-ops, lunar-soi, lunar-flyby, earthrise, return-coast, reentry, splashdown.
  3. If you find new milestones, add them with unique IDs and ALWAYS provide a brief description in updatedDetail.
  4. DO NOT create new milestones that are extremely similar or redundant with the Existing Milestones list above. 
     If a milestone in the news is already in the list, update it by ID instead of creating a new one.
  5. Ensure all times are in ISO 8601 format and include a specific time zone offset (e.g. +00:00 or Z).
  6. Check for new times/ETAs for upcoming milestones to ensure they are always up to date.
  7. Extract numeric, factual values for telemetry (distance, velocity, etc) and store them.
  8. IMPORTANT: Calculate the mission 'day' strictly based on the launch time of 2026-04-01T22:35:00Z. 
     Day 1 is first 24h, Day 2 is 24-48h, etc. Ensure 'day' and 'time' are consistent.
  9. DO NOT schedule lunar events (like lunar orbit, flyby, or communications blackout) before the spacecraft reaches the Moon on Day 5.`;

  const finalResponse = await generateWithFallback({
    contents: formatPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  const resultText = finalResponse.text;
  if (!resultText) throw new Error("No text returned from Gemini");
  return JSON.parse(resultText);
}

function toTitleCase(str) {
  if (!str) return str;
  const PROPER_NOUNS = ["ISS", "TLI", "SLS", "MECO", "ICPS", "EDT", "NASA", "CSA", "AVATAR", "OTC"];
  return str.split(/\s+/).map(word => {
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (PROPER_NOUNS.includes(clean)) return word;
    if (word.includes("-")) {
        return word.split("-").map(part => {
            if (part.length === 0) return part;
            if (!isNaN(part)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join("-");
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

function mergeMilestones(base, updates) {
  if (!Array.isArray(updates) || updates.length === 0) return base;
  const merged = base.map((m) => {
    const upd = updates.find((u) => u && u.id === m.id);
    if (!upd) return m;
    const copy = { ...m };
    if (upd.completed === true) copy.completed = true;
    if (upd.completedTime) {
      const d = new Date(upd.completedTime);
      if (!isNaN(d.getTime())) {
          copy.time = d.toISOString();
          copy.day = calculateMissionDay(copy.time);
      }
    } else if (upd.updatedTime) {
      const d = new Date(upd.updatedTime);
      if (!isNaN(d.getTime())) {
          copy.time = d.toISOString();
          copy.day = calculateMissionDay(copy.time);
      }
    }
    if (upd.updatedDetail && upd.updatedDetail.length > 0) {
      copy.detail = upd.updatedDetail;
    }
    // Only trust AI 'day' if we don't have a time, but we usually have time
    if (!copy.time && upd.day) copy.day = upd.day;
    
    // Ensure Title Case
    copy.label = toTitleCase(copy.label);
    
    return copy;
  });
  
  // New milestones
  const launchDate = new Date("2026-04-01T22:35:00Z");
  updates.forEach((upd) => {
    if (!upd || !upd.id) return;
    if (base.find((m) => m.id === upd.id)) return;
    const t = new Date(upd.completedTime || upd.updatedTime || Date.now());
    if (isNaN(t.getTime())) return;

    // Reject milestones with dates before launch or unreasonably far in the future (>30 days)
    if (t < launchDate || t > new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      console.warn(`Rejecting milestone "${upd.id}" — date ${t.toISOString()} is outside mission window`);
      return;
    }

    const timeStr = t.toISOString();
    const day = calculateMissionDay(timeStr);
    
    merged.push({
      id: upd.id, 
      label: toTitleCase(upd.label || upd.id.replace(/-/g, " ")),
      detail: upd.updatedDetail || "",
      time: timeStr, 
      day: day,
      icon: upd.icon || "📌",
      completed: !!upd.completed, 
      isNew: true,
    });
  });
  merged.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });
  return merged;
}


async function main() {
  let data;
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    data = JSON.parse(rawData);

    const update = await fetchNews(data.milestones);
    
    // Merge updates
    const newUpdateObj = {
      ...update,
      fetchedAt: new Date().toISOString()
    };
    delete newUpdateObj.milestoneUpdates; // save space
    
    data.update = newUpdateObj;
    data.lastError = null; // Clear previous error
    
    // Add to history (keep last 20)
    data.history = [newUpdateObj, ...(data.history || [])].slice(0, 20);
    
    // Merge milestones
    if (update.milestoneUpdates && update.milestoneUpdates.length > 0) {
      data.milestones = mergeMilestones(data.milestones, update.milestoneUpdates);
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log("data.json updated successfully.");

  } catch (err) {
    console.error("Error during fetch:", err);
    if (data) {
      data.lastError = err.message;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    }
    process.exit(1);
  }
}

main();
