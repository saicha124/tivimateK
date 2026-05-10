import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Channel, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000);
  return `${mins} min`;
}

interface ProgramInfoProps {
  onPlay: (channel: Channel) => void;
}

export function ProgramInfo({ onPlay }: ProgramInfoProps) {
  const colors = useColors();
  const { selectedChannel, favorites, toggleFavorite } = useIPTV();

  if (!selectedChannel) return null;

  const now = Date.now();
  const currentProg = selectedChannel.epg?.find(
    (p) => p.startTime <= now && p.endTime >= now
  );
  const nextProg = selectedChannel.epg
    ?.filter((p) => p.startTime > now)
    .sort((a, b) => a.startTime - b.startTime)[0];

  const isFav = favorites.includes(selectedChannel.id);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.secondary }]}>
        {selectedChannel.logo ? (
          <Image
            source={{ uri: selectedChannel.logo }}
            style={styles.logo}
            contentFit="contain"
          />
        ) : (
          <Feather name="tv" size={32} color={colors.mutedForeground} />
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {currentProg?.title ?? selectedChannel.name}
          </Text>
          <TouchableOpacity
            onPress={() => toggleFavorite(selectedChannel.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={isFav ? "star" : "star"}
              size={18}
              color={isFav ? "#FFC107" : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {currentProg && (
          <Text style={[styles.time, { color: colors.primary }]}>
            {formatTime(currentProg.startTime)} — {formatTime(currentProg.endTime)}
            {"  "}
            <Text style={{ color: colors.mutedForeground }}>
              {formatDuration(currentProg.startTime, currentProg.endTime)}
            </Text>
          </Text>
        )}

        <Text style={[styles.channel, { color: colors.mutedForeground }]} numberOfLines={1}>
          {selectedChannel.group} · {selectedChannel.name}
        </Text>

        {currentProg?.description && (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            {currentProg.description}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onPlay(selectedChannel)}
        style={[styles.playButton, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Feather name="play" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  thumbnail: {
    width: 100,
    height: 64,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 100,
    height: 64,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  channel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
