import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type PlaylistType = "M3U" | "XtreamCodes" | "StalkerPortal";

export interface EPGProgram {
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
}

export interface Channel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
  tvgId?: string;
  epg?: EPGProgram[];
}

export interface VODItem {
  id: string;
  name: string;
  category: string;
  logo?: string;
  url: string;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  type: PlaylistType;
  url?: string;
  username?: string;
  password?: string;
  serverAddress?: string;
  macAddress?: string;
  channels: Channel[];
  movies: VODItem[];
  shows: VODItem[];
  lastUpdated: number;
}

export type Section = "TV" | "Movies" | "Shows" | "My List" | "Recordings";

interface IPTVContextValue {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  setActivePlaylist: (playlist: Playlist | null) => void;
  currentSection: Section;
  setCurrentSection: (section: Section) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  selectedChannel: Channel | null;
  setSelectedChannel: (channel: Channel | null) => void;
  favorites: string[];
  toggleFavorite: (channelId: string) => void;
  blockedChannels: string[];
  toggleBlockChannel: (channelId: string) => void;
  hiddenChannels: string[];
  toggleHideChannel: (channelId: string) => void;
  hiddenGroups: string[];
  toggleHideGroup: (group: string) => void;
  addPlaylist: (playlist: Omit<Playlist, "id" | "channels" | "movies" | "shows" | "lastUpdated">) => Promise<void>;
  removePlaylist: (id: string) => void;
  isLoading: boolean;
  loadingMessage: string;
}

const IPTVContext = createContext<IPTVContextValue | null>(null);

function parseM3U(text: string): { channels: Channel[]; movies: VODItem[]; shows: VODItem[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const channels: Channel[] = [];
  const movies: VODItem[] = [];
  const shows: VODItem[] = [];

  let currentMeta: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#EXTINF")) {
      currentMeta = {};
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) currentMeta.name = nameMatch[1].trim();
      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) currentMeta.group = groupMatch[1];
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) currentMeta.logo = logoMatch[1];
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      if (tvgIdMatch) currentMeta.tvgId = tvgIdMatch[1];
    } else if (line.startsWith("http") || line.startsWith("rtmp") || line.startsWith("rtsp")) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const name = currentMeta.name || "Unknown";
      const group = currentMeta.group || "General";
      const url = line;

      const groupLower = group.toLowerCase();
      if (
        groupLower.includes("movie") ||
        groupLower.includes("film") ||
        groupLower.includes("vod")
      ) {
        movies.push({
          id,
          name,
          category: group,
          logo: currentMeta.logo,
          url,
        });
      } else if (
        groupLower.includes("serie") ||
        groupLower.includes("show") ||
        groupLower.includes("episode")
      ) {
        shows.push({
          id,
          name,
          category: group,
          logo: currentMeta.logo,
          url,
        });
      } else {
        channels.push({
          id,
          name,
          group,
          logo: currentMeta.logo,
          url,
          tvgId: currentMeta.tvgId,
        });
      }
      currentMeta = {};
    }
  }

  return { channels, movies, shows };
}

async function fetchXtreamCodes(
  serverAddress: string,
  username: string,
  password: string
): Promise<{ channels: Channel[]; movies: VODItem[]; shows: VODItem[] }> {
  const base = serverAddress.replace(/\/$/, "");
  const m3uUrl = `${base}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;

  const response = await fetch(m3uUrl);
  if (!response.ok) throw new Error("Failed to fetch Xtream Codes playlist");
  const text = await response.text();
  return parseM3U(text);
}

export function IPTVProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylistState] = useState<Playlist | null>(null);
  const [currentSection, setCurrentSection] = useState<Section>("TV");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [blockedChannels, setBlockedChannels] = useState<string[]>([]);
  const [hiddenChannels, setHiddenChannels] = useState<string[]>([]);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("playlists");
        if (stored) {
          const parsed = JSON.parse(stored) as Playlist[];
          setPlaylists(parsed);
          if (parsed.length > 0) setActivePlaylistState(parsed[0]);
        }
        const favs = await AsyncStorage.getItem("favorites");
        if (favs) setFavorites(JSON.parse(favs));
        const blocked = await AsyncStorage.getItem("blockedChannels");
        if (blocked) setBlockedChannels(JSON.parse(blocked));
        const hidden = await AsyncStorage.getItem("hiddenChannels");
        if (hidden) setHiddenChannels(JSON.parse(hidden));
        const hiddenGrps = await AsyncStorage.getItem("hiddenGroups");
        if (hiddenGrps) setHiddenGroups(JSON.parse(hiddenGrps));
      } catch {}
    })();
  }, []);

  const setActivePlaylist = useCallback((playlist: Playlist | null) => {
    setActivePlaylistState(playlist);
    setSelectedGroup(null);
    setSelectedChannel(null);
  }, []);

  const toggleFavorite = useCallback(async (channelId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      AsyncStorage.setItem("favorites", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleBlockChannel = useCallback(async (channelId: string) => {
    setBlockedChannels((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      AsyncStorage.setItem("blockedChannels", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleHideChannel = useCallback(async (channelId: string) => {
    setHiddenChannels((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      AsyncStorage.setItem("hiddenChannels", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleHideGroup = useCallback(async (group: string) => {
    setHiddenGroups((prev) => {
      const next = prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group];
      AsyncStorage.setItem("hiddenGroups", JSON.stringify(next));
      return next;
    });
  }, []);

  const addPlaylist = useCallback(
    async (data: Omit<Playlist, "id" | "channels" | "movies" | "shows" | "lastUpdated">) => {
      setIsLoading(true);
      setLoadingMessage("Connecting to server...");
      try {
        let channels: Channel[] = [];
        let movies: VODItem[] = [];
        let shows: VODItem[] = [];

        if (data.type === "M3U") {
          setLoadingMessage("Fetching playlist...");
          const response = await fetch(data.url!);
          if (!response.ok) throw new Error("Failed to fetch M3U");
          const text = await response.text();
          setLoadingMessage("Processing channels...");
          const parsed = parseM3U(text);
          channels = parsed.channels;
          movies = parsed.movies;
          shows = parsed.shows;
        } else if (data.type === "XtreamCodes") {
          setLoadingMessage("Fetching channels...");
          const parsed = await fetchXtreamCodes(
            data.serverAddress!,
            data.username!,
            data.password!
          );
          channels = parsed.channels;
          movies = parsed.movies;
          shows = parsed.shows;
        } else if (data.type === "StalkerPortal") {
          setLoadingMessage("Connecting to Stalker portal...");
          channels = [];
        }

        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const playlist: Playlist = {
          ...data,
          id,
          channels,
          movies,
          shows,
          lastUpdated: Date.now(),
        };

        setPlaylists((prev) => {
          const next = [...prev, playlist];
          AsyncStorage.setItem("playlists", JSON.stringify(next));
          return next;
        });
        setActivePlaylistState(playlist);
        setSelectedGroup(null);
        setSelectedChannel(null);
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    },
    []
  );

  const removePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== id);
      AsyncStorage.setItem("playlists", JSON.stringify(next));
      if (activePlaylist?.id === id) {
        setActivePlaylistState(next[0] ?? null);
      }
      return next;
    });
  }, [activePlaylist]);

  return (
    <IPTVContext.Provider
      value={{
        playlists,
        activePlaylist,
        setActivePlaylist,
        currentSection,
        setCurrentSection,
        selectedGroup,
        setSelectedGroup,
        selectedChannel,
        setSelectedChannel,
        favorites,
        toggleFavorite,
        blockedChannels,
        toggleBlockChannel,
        hiddenChannels,
        toggleHideChannel,
        hiddenGroups,
        toggleHideGroup,
        addPlaylist,
        removePlaylist,
        isLoading,
        loadingMessage,
      }}
    >
      {children}
    </IPTVContext.Provider>
  );
}

export function useIPTV() {
  const ctx = useContext(IPTVContext);
  if (!ctx) throw new Error("useIPTV must be used within IPTVProvider");
  return ctx;
}
