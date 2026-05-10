import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export default function PlayerScreen() {
  const { url, name } = useLocalSearchParams<{ url: string; name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [status, setStatus] = useState<any>({});
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideControls = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handlePress = useCallback(() => {
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
    if (status.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [status.isPlaying]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        activeOpacity={1}
      >
        {url ? (
          <Video
            ref={videoRef}
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls={false}
            onPlaybackStatusUpdate={(s) => {
              setStatus(s);
              if ((s as any).isBuffering !== undefined) {
                setIsBuffering(!!(s as any).isBuffering);
              }
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
          <View
            style={[
              styles.topBar,
              { paddingTop: topPad + 8, backgroundColor: "rgba(0,0,0,0.6)" },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.channelName} numberOfLines={1}>
              {name ?? "Unknown Channel"}
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={togglePlay}>
              <Feather
                name={status.isPlaying ? "pause" : "play"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Center play/pause */}
          <View style={styles.centerControls} pointerEvents="none">
            <View style={[styles.centerBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Feather
                name={status.isPlaying ? "pause" : "play"}
                size={36}
                color="#fff"
              />
            </View>
          </View>

          {/* Bottom bar */}
          <View
            style={[
              styles.bottomBar,
              {
                paddingBottom: bottomPad + 8,
                backgroundColor: "rgba(0,0,0,0.6)",
              },
            ]}
          >
            <Feather name="radio" size={14} color={colors.primary} />
            <Text style={styles.liveLabel}>LIVE</Text>
            <Text style={styles.streamInfo} numberOfLines={1}>
              {url ? url.substring(0, 60) + (url.length > 60 ? "…" : "") : ""}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  channelName: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  centerControls: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  centerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  liveLabel: {
    color: "#ff4444",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  streamInfo: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
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
