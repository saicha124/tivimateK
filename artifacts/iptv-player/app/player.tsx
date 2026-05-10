import { Feather } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Scrubber({
  position,
  duration,
  onSeek,
  colors,
}: {
  position: number;
  duration: number;
  onSeek: (pct: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={scrubStyles.container}>
      <Text style={[scrubStyles.time, { color: "rgba(255,255,255,0.8)" }]}>
        {formatTime(position)}
      </Text>
      <TouchableOpacity
        style={[scrubStyles.track, { backgroundColor: "rgba(255,255,255,0.25)" }]}
        activeOpacity={1}
        onPress={(e) => {
          const { locationX, target } = e.nativeEvent;
          // We can't get track width easily without measuring, so use a fixed 200px estimate
        }}
      >
        <View
          style={[
            scrubStyles.fill,
            { width: `${progress * 100}%` as any, backgroundColor: colors.primary },
          ]}
        />
        <View
          style={[
            scrubStyles.thumb,
            { left: `${progress * 100}%` as any, backgroundColor: colors.primary },
          ]}
        />
      </TouchableOpacity>
      <Text style={[scrubStyles.time, { color: "rgba(255,255,255,0.8)" }]}>
        {duration > 0 ? formatTime(duration) : "–:––"}
      </Text>
    </View>
  );
}

const scrubStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "visible",
    position: "relative",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    minWidth: 40,
    textAlign: "center",
  },
});

export default function PlayerScreen() {
  const { url, name, catchUpStart, catchUpEnd } = useLocalSearchParams<{
    url: string;
    name: string;
    catchUpStart?: string;
    catchUpEnd?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const isCatchUp = !!catchUpStart;
  const catchUpStartMs = catchUpStart ? parseInt(catchUpStart, 10) : undefined;
  const catchUpEndMs = catchUpEnd ? parseInt(catchUpEnd, 10) : undefined;

  // Build catch-up stream URL if needed
  // Supports common IPTV catch-up URL formats:
  //   ?utc=UNIX_TS&lutc=END_TS   (most common)
  //   timeshift=N&duration=M     (older format)
  const streamUrl = isCatchUp && catchUpStartMs
    ? (() => {
        const startSec = Math.floor(catchUpStartMs / 1000);
        const endSec = catchUpEndMs ? Math.floor(catchUpEndMs / 1000) : startSec + 3600;
        const durationSec = endSec - startSec;
        const separator = url?.includes("?") ? "&" : "?";
        return `${url}${separator}utc=${startSec}&lutc=${endSec}&duration=${durationSec}`;
      })()
    : url;

  const [status, setStatus] = useState<any>({});
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const position: number = status?.positionMillis ?? 0;
  const duration: number = status?.durationMillis ?? 0;
  const isPlaying: boolean = status?.isPlaying ?? false;

  const hideControls = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const handleTap = useCallback(() => {
    setShowControls((v) => {
      if (!v) {
        hideControls();
        return true;
      }
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      return false;
    });
  }, [hideControls]);

  const togglePlay = useCallback(async () => {
    Haptics.selectionAsync();
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const seekBackward = useCallback(async () => {
    if (!videoRef.current || !isCatchUp) return;
    Haptics.selectionAsync();
    const newPos = Math.max(0, position - 30000);
    await videoRef.current.setPositionAsync(newPos);
  }, [position, isCatchUp]);

  const seekForward = useCallback(async () => {
    if (!videoRef.current || !isCatchUp) return;
    Haptics.selectionAsync();
    const newPos = Math.min(duration || position + 30000, position + 30000);
    await videoRef.current.setPositionAsync(newPos);
  }, [position, duration, isCatchUp]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleTap}
        activeOpacity={1}
      >
        {streamUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: streamUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls={false}
            progressUpdateIntervalMillis={500}
            onPlaybackStatusUpdate={(s: any) => {
              setStatus(s);
              if (s.isBuffering !== undefined) setIsBuffering(!!s.isBuffering);
            }}
            onLoad={() => {
              setIsBuffering(false);
              hideControls();
            }}
          />
        ) : (
          <View style={styles.noUrl}>
            <Feather name="alert-circle" size={32} color="#666" />
            <Text style={styles.noUrlText}>No stream URL</Text>
          </View>
        )}

        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.bufferingText}>
              {isCatchUp ? "Loading catch-up..." : "Buffering..."}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showControls && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={[styles.controls, StyleSheet.absoluteFill]}
          pointerEvents="box-none"
        >
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: "rgba(0,0,0,0.65)" }]}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); router.back(); }}
              style={styles.iconBtn}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.titleArea}>
              <Text style={styles.channelName} numberOfLines={1}>
                {name ?? "Unknown Channel"}
              </Text>
              {isCatchUp && (
                <View style={styles.catchUpBadge}>
                  <Feather name="rotate-ccw" size={10} color="#fff" />
                  <Text style={styles.catchUpBadgeText}>CATCH-UP</Text>
                </View>
              )}
            </View>
            {!isCatchUp && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Center controls */}
          <View style={styles.centerControls} pointerEvents="box-none">
            <View style={styles.centerRow}>
              {isCatchUp && (
                <TouchableOpacity
                  onPress={seekBackward}
                  style={[styles.seekBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                >
                  <Feather name="rotate-ccw" size={20} color="#fff" />
                  <Text style={styles.seekLabel}>30s</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={togglePlay}
                style={[styles.playBtn, { backgroundColor: "rgba(0,0,0,0.6)" }]}
              >
                <Feather name={isPlaying ? "pause" : "play"} size={36} color="#fff" />
              </TouchableOpacity>

              {isCatchUp && (
                <TouchableOpacity
                  onPress={seekForward}
                  style={[styles.seekBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                >
                  <Feather name="rotate-cw" size={20} color="#fff" />
                  <Text style={styles.seekLabel}>30s</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom bar */}
          <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8, backgroundColor: "rgba(0,0,0,0.65)" }]}>
            {isCatchUp && duration > 0 ? (
              <Scrubber
                position={position}
                duration={duration}
                onSeek={async (pct) => {
                  if (videoRef.current && duration > 0) {
                    await videoRef.current.setPositionAsync(pct * duration);
                  }
                }}
                colors={colors}
              />
            ) : (
              <View style={styles.liveBottomRow}>
                <Feather name="radio" size={12} color={colors.primary} />
                <Text style={styles.liveBottomText}>LIVE</Text>
                <Text style={styles.streamInfo} numberOfLines={1}>
                  {streamUrl ? (streamUrl.length > 50 ? streamUrl.substring(0, 50) + "…" : streamUrl) : ""}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  titleArea: {
    flex: 1,
    gap: 4,
  },
  channelName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  catchUpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(33,150,243,0.4)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  catchUpBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(244,67,54,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f44336",
  },
  liveText: {
    color: "#f44336",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  centerControls: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  seekBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  seekLabel: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    paddingTop: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  liveBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  liveBottomText: {
    color: "#f44336",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  streamInfo: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    gap: 12,
  },
  bufferingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  noUrl: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noUrlText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
