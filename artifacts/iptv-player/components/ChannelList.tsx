import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChannelContextMenu } from "@/components/ChannelContextMenu";
import { Channel, EPGProgram, VODItem, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

function nowProgram(channel: Channel) {
  const now = Date.now();
  return channel.epg?.find((p) => p.startTime <= now && p.endTime >= now);
}

function nextProgram(channel: Channel) {
  const now = Date.now();
  const sorted = (channel.epg ?? []).filter((p) => p.startTime > now).sort((a, b) => a.startTime - b.startTime);
  return sorted[0];
}

function progress(channel: Channel) {
  const prog = nowProgram(channel);
  if (!prog) return 0;
  const dur = prog.endTime - prog.startTime;
  const elapsed = Date.now() - prog.startTime;
  return Math.min(1, Math.max(0, elapsed / dur));
}

export function ChannelList({
  onPlayChannel,
  onCatchUp,
}: {
  onPlayChannel: (channel: Channel) => void;
  onCatchUp: (channel: Channel, program: EPGProgram) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    activePlaylist,
    currentSection,
    selectedGroup,
    selectedChannel,
    setSelectedChannel,
    favorites,
    toggleFavorite,
    blockedChannels,
    hiddenChannels,
  } = useIPTV();

  const [contextChannel, setContextChannel] = useState<Channel | null>(null);

  const channels = activePlaylist?.channels ?? [];
  const movies = activePlaylist?.movies ?? [];
  const shows = activePlaylist?.shows ?? [];

  const items = useMemo(() => {
    if (currentSection === "TV") {
      let list = channels.filter(
        (c) => !hiddenChannels.includes(c.id)
      );
      if (!selectedGroup) list = list.slice(0, 100);
      else list = list.filter((c) => c.group === selectedGroup);
      return list;
    }
    if (currentSection === "Movies") {
      const vod = selectedGroup ? movies.filter((m) => m.category === selectedGroup) : movies.slice(0, 100);
      return vod.map((v) => ({
        id: v.id,
        name: v.name,
        group: v.category,
        logo: v.logo,
        url: v.url,
      } as Channel));
    }
    if (currentSection === "Shows") {
      const vod = selectedGroup ? shows.filter((s) => s.category === selectedGroup) : shows.slice(0, 100);
      return vod.map((v) => ({
        id: v.id,
        name: v.name,
        group: v.category,
        logo: v.logo,
        url: v.url,
      } as Channel));
    }
    if (currentSection === "My List") {
      return channels.filter((c) => favorites.includes(c.id) && !hiddenChannels.includes(c.id));
    }
    return [];
  }, [currentSection, selectedGroup, channels, movies, shows, favorites, hiddenChannels]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLongPress = (channel: Channel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextChannel(channel);
  };

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={items.length > 0}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 8 }}
        renderItem={({ item: channel, index }) => {
          const active = selectedChannel?.id === channel.id;
          const now = nowProgram(channel);
          const prog = progress(channel);
          const isFav = favorites.includes(channel.id);
          const isBlocked = blockedChannels.includes(channel.id);

          return (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedChannel(channel);
              }}
              onLongPress={() => handleLongPress(channel)}
              style={[
                styles.item,
                active && { backgroundColor: colors.highlight },
                isBlocked && { opacity: 0.45 },
                { borderBottomColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.indexContainer}>
                <Text style={[styles.index, { color: colors.mutedForeground }]}>{index + 1}</Text>
              </View>
              <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
                {channel.logo ? (
                  <Image source={{ uri: channel.logo }} style={styles.logoImg} contentFit="contain" />
                ) : (
                  <Feather name="tv" size={18} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: active ? colors.primary : isBlocked ? colors.destructive : colors.foreground }]} numberOfLines={1}>
                    {channel.name}
                  </Text>
                  {isBlocked && (
                    <View style={[styles.badge, { backgroundColor: `${colors.destructive}22` }]}>
                      <Text style={[styles.badgeText, { color: colors.destructive }]}>BLOCKED</Text>
                    </View>
                  )}
                </View>
                {now ? (
                  <>
                    <Text style={[styles.program, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {now.title}
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
                      <View style={[styles.progressFill, { backgroundColor: colors.progressFg, width: `${prog * 100}%` }]} />
                    </View>
                  </>
                ) : (
                  <Text style={[styles.program, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {channel.group}
                  </Text>
                )}
              </View>
              {active && (
                <TouchableOpacity
                  onPress={() => onPlayChannel(channel)}
                  style={[styles.playBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="play" size={14} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  toggleFavorite(channel.id);
                }}
                style={styles.favBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="star" size={16} color={isFav ? "#FFC107" : colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleLongPress(channel)}
                style={styles.moreBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="more-vertical" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="tv" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No channels</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Select a group or add a playlist
            </Text>
          </View>
        }
      />

      <ChannelContextMenu
        channel={contextChannel}
        visible={!!contextChannel}
        onClose={() => setContextChannel(null)}
        onPlay={onPlayChannel}
        onCatchUp={onCatchUp}
      />
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  indexContainer: {
    width: 24,
    alignItems: "center",
  },
  index: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  logo: {
    width: 44,
    height: 32,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 44,
    height: 32,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  program: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginTop: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  favBtn: {
    padding: 4,
  },
  moreBtn: {
    padding: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
