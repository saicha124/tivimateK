import { Channel, EPGProgram } from "@/context/IPTVContext";

const PROGRAM_NAMES: Record<string, string[]> = {
  news: [
    "Morning News", "World News", "Breaking News", "Evening Report",
    "Business Hour", "Weather Update", "Sports Headlines", "Late Night News",
    "International News", "Local News", "News at Ten", "The Briefing",
    "Morning Headlines", "Midday Update", "Weekend Review", "Prime Time News",
  ],
  sports: [
    "Premier League Highlights", "Champions League Live", "NFL Sunday",
    "NBA Live", "Tennis Masters", "Golf Classic", "Boxing Tonight",
    "Formula 1 Race", "Cricket Live", "Rugby World Cup", "Athletics",
    "Cycling Tour", "Swimming Championships", "Sports Centre",
    "Football Daily", "Sports Extra", "Match of the Day", "The Sports Show",
  ],
  entertainment: [
    "The Tonight Show", "Late Night Live", "Talk of the Town",
    "Celebrity Edition", "Reality Check", "Game Night", "The Big Interview",
    "Award Night", "Comedy Hour", "Drama Special", "Movie Night",
    "The Grand Finale", "Season Premiere", "Behind the Scenes",
    "Pop Culture Weekly", "Entertainment Tonight",
  ],
  movies: [
    "Action Blockbuster", "Thriller Night", "Romantic Comedy",
    "Sci-Fi Marathon", "Classic Cinema", "Horror Special",
    "Documentary Feature", "Animated Movie", "Crime Drama",
    "Historical Epic", "Fantasy Adventure", "Western Night",
    "Indie Film", "Foreign Language Film",
  ],
  default: [
    "Live Show", "Documentary", "Talk Show", "Magazine",
    "Series Episode", "Special Report", "Variety Show",
    "Music Special", "Entertainment Tonight", "Weekly Roundup",
    "Feature Film", "Kids Hour", "Cooking Show", "Travel Series",
    "Nature Special", "History Hour", "Science Tonight", "Arts & Culture",
  ],
};

const PROGRAM_DURATIONS = [30, 30, 60, 60, 90, 120]; // weighted towards 30-60 min

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

export function generateMockEPG(
  channel: Channel,
  startMs: number,
  endMs: number
): EPGProgram[] {
  const category = getCategory(channel.name, channel.group);
  const programs = PROGRAM_NAMES[category];

  const result: EPGProgram[] = [];
  let cursor = startMs;

  let seed = channel.name.charCodeAt(0) * 31 + channel.name.length + Math.floor(startMs / 86400000);

  while (cursor < endMs) {
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

export function ensureEPG(channels: Channel[], daysBack = 2, daysForward = 3): Channel[] {
  const now = Date.now();
  const startMs = now - daysBack * 24 * 60 * 60 * 1000;
  const endMs = now + daysForward * 24 * 60 * 60 * 1000;

  return channels.map((c) => ({
    ...c,
    epg: c.epg && c.epg.length > 0 ? c.epg : generateMockEPG(c, startMs, endMs),
  }));
}

export function getDayStart(dayOffset: number): number {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getDayEnd(dayOffset: number): number {
  return getDayStart(dayOffset) + 24 * 60 * 60 * 1000;
}

export function formatDayLabel(dayOffset: number): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === -1) return "Yesterday";
  if (dayOffset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatDayShort(dayOffset: number): { weekday: string; date: string } {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    date: String(d.getDate()),
  };
}
