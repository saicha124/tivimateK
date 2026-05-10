import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";
import { ensureEPG, generateMockEPG } from "@/utils/mockEPG";

const SLOT_WIDTH = 120; // px per 30 min
const CHANNEL_COL_WIDTH = 72;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 36;
const MINS_PER_SLOT = 30;

function msToSlotOffset(ms: number, refTime: number): number {
  return ((ms - refTime) / (MINS_PER_SLOT * 60 * 1000)) * SLOT_WIDTH;
}

function formatHour(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

interface ProgramBlockProps {
  program: EPGProgram;
  refTime: number;
  isActive: boolean;
  isNow: boolean;
  onPress: () => void;
}

function ProgramBlock({ program, refTime, isActive, isNow, onPress }: ProgramBlockProps) {
  const colors = useColors();
  const left = msToSlotOffset(program.startTime, refTime);
  const width = msToSlotOffset(program.endTime, refTime) - left - 2;

  if (width < 4) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.programBlock,
        {
          left,
          width,
          backgroundColor: isActive
            ? colors.primary
            : isNow
            ? colors.highlight
            : colors.secondary,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.programTitle,
          { color: isActive ? "#fff" : isNow ? colors.foreground : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {program.title}
      </Text>
      {width > 80 && (
        <Text
          style={[
            styles.programTime,
            { color: isActive ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
          ]}
        >
          {formatHour(program.startTime)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface EPGGridProps {
  onPlayChannel: (channel: Channel) => void;
}

export function EPGGrid({ onPlayChannel }: EPGGridProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activePlaylist, selectedGroup, currentSection, selectedChannel, setSelectedChannel } = useIPTV();

  const now = Date.now();
  // Round down to nearest 30min for the grid reference start (2 hours back)
  const refTime = useMemo(() => {
    const hoursBack = 2;
    return Math.floor((now - hoursBack * 60 * 60 * 1000) / (MINS_PER_SLOT * 60 * 1000)) * (MINS_PER_SLOT * 60 * 1000);
  }, []);

  // Generate time slots: from refTime to +8h
  const totalSlots = (2 + 8) * 2; // 2h back + 8h forward, 2 slots per hour
  const timeSlots = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => refTime + i * MINS_PER_SLOT * 60 * 1000);
  }, [refTime]);

  const totalWidth = totalSlots * SLOT_WIDTH;
  const nowOffset = msToSlotOffset(now, refTime);

  // Get channels for the current group/section
  const rawChannels = useMemo(() => {
    if (!activePlaylist) return [];
    const all = activePlaylist.channels;
    const filtered = selectedGroup ? all.filter((c) => c.group === selectedGroup) : all.slice(0, 50);
    return filtered.slice(0, 60);
  }, [activePlaylist, selectedGroup]);

  const channels = useMemo(() => ensureEPG(rawChannels), [rawChannels]);

  // Synchronized horizontal scroll
  const mainScrollRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);
  const rowScrollRefs = useRef<Map<string, ScrollView | null>>(new Map());
  const isScrolling = useRef(false);
  const [selectedProgram, setSelectedProgram] = useState<EPGProgram | null>(null);

  const syncScroll = useCallback((x: number, sourceId: string) => {
    if (isScrolling.current) return;
    isScrolling.current = true;

    headerScrollRef.current?.scrollTo({ x, animated: false });
    rowScrollRefs.current.forEach((ref, id) => {
      if (id !== sourceId && ref) {
        ref.scrollTo({ x, animated: false });
      }
    });

    setTimeout(() => { isScrolling.current = false; }, 50);
  }, []);

  const onHeaderScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncScroll(e.nativeEvent.contentOffset.x, "header");
  }, [syncScroll]);

  const onRowScroll = useCallback((channelId: string) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncScroll(e.nativeEvent.contentOffset.x, channelId);
  }, [syncScroll]);

  // Initial scroll to "now minus 1 slot"
  const initialX = clamp(nowOffset - SLOT_WIDTH, 0, totalWidth);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleProgramPress = (channel: Channel, program: EPGProgram) => {
    Haptics.selectionAsync();
    setSelectedChannel(channel);
    setSelectedProgram(program);
  };

  const renderChannelRow = useCallback(({ item: channel }: { item: Channel }) => {
    const isActive = selectedChannel?.id === channel.id;
    const nowProg = channel.epg?.find((p) => p.startTime <= now && p.endTime >= now);

    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        {/* Channel column */}
        <TouchableOpacity
          style={[
            styles.channelCell,
            {
              backgroundColor: isActive ? colors.highlight : colors.sidebar,
              borderRightColor: colors.border,
            },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            setSelectedChannel(channel);
          }}
          onLongPress={() => onPlayChannel(channel)}
          activeOpacity={0.7}
        >
          <View style={[styles.logoContainer, { backgroundColor: colors.secondary }]}>
            {channel.logo ? (
              <Image source={{ uri: channel.logo }} style={styles.logo} contentFit="contain" />
            ) : (
              <Feather name="tv" size={14} color={colors.mutedForeground} />
            )}
          </View>
          <Text
            style={[
              styles.channelName,
              { color: isActive ? colors.primary : colors.mutedForeground },
            ]}
            numberOfLines={2}
          >
            {channel.name}
          </Text>
        </TouchableOpacity>

        {/* Programs row */}
        <ScrollView
          ref={(ref) => rowScrollRefs.current.set(channel.id, ref)}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onRowScroll(channel.id)}
          contentOffset={{ x: initialX, y: 0 }}
          style={styles.programsScroll}
          contentContainerStyle={{ width: totalWidth, height: ROW_HEIGHT }}
        >
          {(channel.epg ?? []).map((program, idx) => {
            const isActiveProg = selectedProgram?.title === program.title &&
              selectedProgram?.startTime === program.startTime &&
              isActive;
            const isNow = program.startTime <= now && program.endTime >= now;
            return (
              <ProgramBlock
                key={idx}
                program={program}
                refTime={refTime}
                isActive={isActiveProg}
                isNow={isNow}
                onPress={() => handleProgramPress(channel, program)}
              />
            );
          })}
          {/* Now line */}
          <View
            style={[
              styles.nowLine,
              { left: nowOffset, backgroundColor: colors.primary },
            ]}
          />
        </ScrollView>
      </View>
    );
  }, [selectedChannel, selectedProgram, colors, now, refTime, totalWidth, nowOffset, initialX, onRowScroll, onPlayChannel]);

  if (!activePlaylist || channels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="grid" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No channels</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Select a group to view the program guide
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* EPG Header (time ruler) */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border, backgroundColor: colors.sidebar }]}>
        <View style={[styles.channelHeaderCell, { borderRightColor: colors.border, backgroundColor: colors.sidebar }]}>
          <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>CH</Text>
        </View>
        <ScrollView
          ref={headerScrollRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          contentOffset={{ x: initialX, y: 0 }}
          style={styles.headerScroll}
          contentContainerStyle={{ width: totalWidth, height: HEADER_HEIGHT }}
        >
          {timeSlots.map((slot, i) => (
            <View
              key={i}
              style={[
                styles.timeSlot,
                {
                  left: i * SLOT_WIDTH,
                  borderRightColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                {formatHour(slot)}
              </Text>
            </View>
          ))}
          {/* Now marker on header */}
          <View style={[styles.nowMarker, { left: nowOffset, backgroundColor: colors.primary }]} />
        </ScrollView>
      </View>

      {/* Channel rows */}
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannelRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 8 }}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT + StyleSheet.hairlineWidth,
          offset: (ROW_HEIGHT + StyleSheet.hairlineWidth) * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
  },
  channelHeaderCell: {
    width: CHANNEL_COL_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  headerScroll: {
    flex: 1,
  },
  timeSlot: {
    position: "absolute",
    width: SLOT_WIDTH,
    height: HEADER_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  nowMarker: {
    position: "absolute",
    top: 0,
    width: 2,
    height: HEADER_HEIGHT,
    borderRadius: 1,
  },
  row: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  channelCell: {
    width: CHANNEL_COL_WIDTH,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
  },
  logoContainer: {
    width: 36,
    height: 24,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 36,
    height: 24,
  },
  channelName: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 12,
  },
  programsScroll: {
    flex: 1,
    overflow: "hidden",
  },
  programBlock: {
    position: "absolute",
    top: 4,
    height: ROW_HEIGHT - 8,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
  },
  programTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  programTime: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  nowLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: ROW_HEIGHT,
    borderRadius: 1,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    color: "#666",
  },
});
