/* global process */
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../public/data.json');
const workflowPath = path.join(__dirname, '../.github/workflows/tracker-update.yml');

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

async function fetchNews() {
  console.log("Step 1: Searching for latest Artemis II news...");
  const searchPrompt = `Search for the absolute latest news regarding the NASA Artemis II mission (launched April 1 2026). 
  Focus on: current mission status, crew health, and any milestones recently reached or upcoming soon. 
  Include numeric factual values if available (distance, velocity).
  Today's date/time is ${new Date().toISOString()}.`;

  const searchResponse = await generateWithFallback({
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  const rawInfo = searchResponse.text;
  console.log("Step 2: Formatting search results into JSON...");

  const formatPrompt = `Based on the following mission information, generate a briefing in strict JSON format.
  
  MISSION INFO: ${rawInfo}
  
  Rules:
  1. Status must be "nominal", "caution", "warning", or "emergency".
  2. milestoneUpdates can include known IDs: launch, core-sep, solar-deploy, perigee-raise, tli, icps-sep, prox-ops, lunar-soi, lunar-flyby, earthrise, return-coast, reentry, splashdown.
  3. If you find new milestones, add them with unique IDs and ALWAYS provide a brief description in updatedDetail.
  4. Ensure all times are in ISO 8601 format and include a specific time zone offset (e.g. +00:00 or Z).
  5. Check for new times/ETAs for upcoming milestones to ensure they are always up to date.
  6. Extract numeric, factual values for telemetry (distance, velocity, etc) and store them.`;

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

function mergeMilestones(base, updates) {
  if (!Array.isArray(updates) || updates.length === 0) return base;
  const merged = base.map((m) => {
    const upd = updates.find((u) => u && u.id === m.id);
    if (!upd) return m;
    const copy = { ...m };
    if (upd.completed === true) copy.completed = true;
    if (upd.completedTime) {
      const d = new Date(upd.completedTime);
      if (!isNaN(d.getTime())) copy.time = d.toISOString();
    } else if (upd.updatedTime) {
      const d = new Date(upd.updatedTime);
      if (!isNaN(d.getTime())) copy.time = d.toISOString();
    }
    if (upd.updatedDetail && upd.updatedDetail.length > 0) {
      copy.detail = upd.updatedDetail;
    }
    return copy;
  });
  
  // New milestones
  updates.forEach((upd) => {
    if (!upd || !upd.id) return;
    if (base.find((m) => m.id === upd.id)) return;
    const t = new Date(upd.completedTime || upd.updatedTime || Date.now());
    if (isNaN(t.getTime())) return;
    merged.push({
      id: upd.id, 
      label: upd.label || upd.id.toUpperCase(),
      detail: upd.updatedDetail || "",
      time: t.toISOString(), 
      day: upd.day || 1,
      icon: upd.icon || "📌",
      completed: !!upd.completed, 
      isNew: true,
    });
  });
  merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return merged;
}

function calculateNextCron(milestones) {
  const now = Date.now();
  const upcoming = milestones.filter(m => !m.completed && new Date(m.time).getTime() > now);
  
  let intervalMinutes = 60 * 6; // Default to every 6 hours

  if (upcoming.length > 0) {
    const nextTime = new Date(upcoming[0].time).getTime();
    const diffHours = (nextTime - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      intervalMinutes = 15; // Every 15 mins
    } else if (diffHours < 12) {
      intervalMinutes = 60; // Every 1 hour
    } else if (diffHours < 24) {
      intervalMinutes = 60 * 3; // Every 3 hours
    }
  }
  return intervalMinutes;
}

function updateWorkflowCron(intervalMinutes) {
  if (!fs.existsSync(workflowPath)) {
    console.warn("Workflow file not found. Skipping cron update.");
    return;
  }
  
  let cronStr = "0 */6 * * *"; // default
  if (intervalMinutes === 15) cronStr = "*/15 * * * *";
  else if (intervalMinutes === 60) cronStr = "0 * * * *";
  else if (intervalMinutes === 60 * 3) cronStr = "0 */3 * * *";
  else if (intervalMinutes === 60 * 6) cronStr = "0 */6 * * *";

  console.log(`Updating workflow cron to: ${cronStr} (every ${intervalMinutes} minutes)`);
  let content = fs.readFileSync(workflowPath, 'utf-8');
  // Regex to find the cron line
  content = content.replace(/cron:\s*['"]?.*['"]?/, `cron: '${cronStr}'`);
  fs.writeFileSync(workflowPath, content);
}

async function main() {
  try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    const update = await fetchNews();
    
    // Merge updates
    const newUpdateObj = {
      ...update,
      fetchedAt: new Date().toISOString()
    };
    delete newUpdateObj.milestoneUpdates; // save space
    
    data.update = newUpdateObj;
    
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
    process.exit(1);
  }
}

main();
