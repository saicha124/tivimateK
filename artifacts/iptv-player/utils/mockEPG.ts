import { Channel, EPGProgram } from "@/context/IPTVContext";

const PROGRAM_NAMES: Record<string, string[]> = {
  news: [
    "Morning News", "World News", "Breaking News", "Evening Report",
    "Business Hour", "Weather Update", "Sports Headlines", "Late Night News",
    "International News", "Local News", "News at Ten", "The Briefing",
  ],
  sports: [
    "Premier League Highlights", "Champions League Live", "NFL Sunday",
    "NBA Live", "Tennis Masters", "Golf Classic", "Boxing Tonight",
    "Formula 1 Race", "Cricket Live", "Rugby World Cup", "Athletics",
    "Cycling Tour", "Swimming Championships", "Sports Centre",
  ],
  entertainment: [
    "The Tonight Show", "Late Night Live", "Talk of the Town",
    "Celebrity Edition", "Reality Check", "Game Night", "The Big Interview",
    "Award Night", "Comedy Hour", "Drama Special", "Movie Night",
    "The Grand Finale", "Season Premiere",
  ],
  movies: [
    "Action Blockbuster", "Thriller Night", "Romantic Comedy",
    "Sci-Fi Marathon", "Classic Cinema", "Horror Special",
    "Documentary Feature", "Animated Movie", "Crime Drama",
    "Historical Epic", "Fantasy Adventure",
  ],
  default: [
    "Live Show", "Documentary", "Talk Show", "Magazine",
    "Series Episode", "Special Report", "Variety Show",
    "Music Special", "Entertainment Tonight", "Weekly Roundup",
    "Feature Film", "Kids Hour", "Cooking Show", "Travel Series",
  ],
};

const PROGRAM_DURATIONS = [30, 60, 90, 120]; // minutes

function getCategory(channelName: string, group: string): string {
  const text = (channelName + " " + group).toLowerCase();
  if (text.includes("news") || text.includes("bbc") || text.includes("cnn")) return "news";
  if (text.includes("sport") || text.includes("espn") || text.includes("sky sport")) return "sports";
  if (text.includes("entertain") || text.includes("comedy") || text.includes("drama")) return "entertainment";
  if (text.includes("movie") || text.includes("film") || text.includes("cinema")) return "movies";
  return "default";
}

function getRandom<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function generateMockEPG(channel: Channel, hoursBack = 2, hoursForward = 6): EPGProgram[] {
  const now = Date.now();
  const start = now - hoursBack * 60 * 60 * 1000;
  const end = now + hoursForward * 60 * 60 * 1000;

  const category = getCategory(channel.name, channel.group);
  const programs = PROGRAM_NAMES[category];

  const result: EPGProgram[] = [];
  let cursor = start;

  let seed = channel.name.charCodeAt(0) + channel.name.length;

  while (cursor < end) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const durationMins = getRandom(PROGRAM_DURATIONS, seed);
    const durationMs = durationMins * 60 * 1000;

    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const title = getRandom(programs, seed);

    result.push({
      title,
      startTime: cursor,
      endTime: cursor + durationMs,
      description: `Watch ${title} on ${channel.name}.`,
    });

    cursor += durationMs;
  }

  return result;
}

export function ensureEPG(channels: Channel[]): Channel[] {
  return channels.map((c) => ({
    ...c,
    epg: c.epg && c.epg.length > 0 ? c.epg : generateMockEPG(c),
  }));
}
