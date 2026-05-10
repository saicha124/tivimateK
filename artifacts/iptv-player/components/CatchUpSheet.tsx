import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScheduleRecordingSheet } from "@/components/ScheduleRecordingSheet";
import { Channel, EPGProgram } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface CatchUpSheetProps {
  channel: Channel | null;
  visible: boolean;
  onClose: () => void;
  onPlay: (channel: Channel, program: EPGProgram) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function programProgress(program: EPGProgram) {
  const now = Date.now();
  if (now < program.startTime || now > program.endTime) return null;
  const dur = program.endTime - program.startTime;
  const elapsed = now - program.startTime;
  return Math.min(1, Math.max(0, elapsed / dur));
}

type ProgramWithDay = { program: EPGProgram; dayLabel: string; isFirstOfDay: boolean };

export function CatchUpSheet({ channel, visible, onClose, onPlay }: CatchUpSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const now = Date.now();
  const [recordProgram, setRecordProgram] = useState<EPGProgram | null>(null);

  const programs = useMemo((): ProgramWithDay[] => {
    if (!channel?.epg) return [];
    const past = channel.epg
      .filter((p) => p.startTime < now + 60000)
      .sort((a, b) => b.startTime - a.startTime);
    const seenDays = new Set<string>();
    return past.map((program) => {
      const dayLabel = formatDate(program.startTime);
      const isFirstOfDay = !seenDays.has(dayLabel);
      seenDays.add(dayLabel);
      return { program, dayLabel, isFirstOfDay };
    });
  }, [channel, now]);

  if (!channel) return null;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Modal
        visible={visible && !recordProgram}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <View style={styles.headerLeft}>
                    <Feather name="rotate-ccw" size={16} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                      Catch-Up
                    </Text>
                  </View>
                  <Text style={[styles.channelName, { color: colors.primary }]} numberOfLines={1}>
                    {channel.name}
                  </Text>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {programs.length === 0 ? (
                  <View style={styles.empty}>
                    <Feather name="calendar" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No catch-up available</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      This channel has no EPG archive data
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={programs}
                    keyExtractor={(item) => String(item.program.startTime)}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item: { program, dayLabel, isFirstOfDay } }) => {
                      const prog = programProgress(program);
                      const isLive = prog !== null;
                      const isPast = program.endTime < now;

                      return (
                        <>
                          {isFirstOfDay && (
                            <View style={[styles.dayHeader, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>
                                {dayLabel}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              onClose();
                              onPlay(channel, program);
                            }}
                            style={[
                              styles.item,
                              { borderBottomColor: colors.border },
                              isLive && { backgroundColor: colors.highlight },
                            ]}
                            activeOpacity={0.7}
                          >
                            <View style={styles.timeCol}>
                              <Text style={[styles.timeText, { color: isLive ? colors.primary : colors.mutedForeground }]}>
                                {formatTime(program.startTime)}
                              </Text>
                              <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
                                {formatDuration(program.startTime, program.endTime)}
                              </Text>
                            </View>

                            <View style={styles.infoCol}>
                              <View style={styles.titleRow}>
                                {isLive && (
                                  <View style={[styles.liveBadge, { backgroundColor: "#f44336" }]}>
                                    <Text style={styles.liveBadgeText}>LIVE</Text>
                                  </View>
                                )}
                                <Text
                                  style={[
                                    styles.programTitle,
                                    { color: isLive ? colors.foreground : isPast ? colors.mutedForeground : colors.foreground },
                                    isLive && { fontFamily: "Inter_600SemiBold" },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {program.title}
                                </Text>
                              </View>
                              {program.description ? (
                                <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>
                                  {program.description}
                                </Text>
                              ) : null}
                              {isLive && prog !== null && (
                                <View style={[styles.progressBar, { backgroundColor: colors.progressBg }]}>
                                  <View
                                    style={[
                                      styles.progressFill,
                                      { backgroundColor: colors.primary, width: `${prog * 100}%` },
                                    ]}
                                  />
                                </View>
                              )}
                            </View>

                            <View style={styles.rightCol}>
                              {(isPast || isLive) && (
                                <TouchableOpacity
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onClose();
                                    onPlay(channel, program);
                                  }}
                                  style={[styles.playBtn, { backgroundColor: isLive ? colors.primary : colors.secondary }]}
                                >
                                  <Feather
                                    name={isLive ? "play" : "rotate-ccw"}
                                    size={13}
                                    color={isLive ? "#fff" : colors.mutedForeground}
                                  />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Haptics.selectionAsync();
                                  setRecordProgram(program);
                                }}
                                style={[styles.recBtn, { backgroundColor: `#f4433618`, borderColor: `#f4433630` }]}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Feather name="circle" size={13} color="#f44336" />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        </>
                      );
                    }}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScheduleRecordingSheet
        channel={channel}
        program={recordProgram}
        visible={!!recordProgram}
        onClose={() => setRecordProgram(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  channelName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  empty: {
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
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  dayHeader: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  timeCol: {
    width: 52,
    alignItems: "flex-start",
    gap: 2,
    paddingTop: 1,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  durationText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flexWrap: "wrap",
  },
  liveBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 1,
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  programTitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  rightCol: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
    gap: 6,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  recBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});
