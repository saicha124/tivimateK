import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Toast } from "@/components/Toast";
import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getProgress(program: EPGProgram) {
  const now = Date.now();
  if (now < program.startTime) return -1; // future
  if (now > program.endTime) return 2;    // past
  return (now - program.startTime) / (program.endTime - program.startTime); // 0-1 = current
}

interface Props {
  visible: boolean;
  channel: Channel | null;
  program: EPGProgram | null;
  onClose: () => void;
  onWatchLive: (channel: Channel) => void;
  onWatchCatchUp: (channel: Channel, program: EPGProgram) => void;
}

export function ProgramDetailsSheet({ visible, channel, program, onClose, onWatchLive, onWatchCatchUp }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { programReminders, addProgramReminder, removeProgramReminder } = useIPTV();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  if (!channel || !program) return null;

  const existingReminder = programReminders.find(
    (r) => r.channelId === channel.id && r.startTime === program.startTime
  );

  const handleToggleReminder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (existingReminder) {
      removeProgramReminder(existingReminder.id);
      setToastMessage("Reminder removed");
    } else {
      addProgramReminder({
        channelId: channel.id,
        channelName: channel.name,
        channelLogo: channel.logo,
        programTitle: program.title,
        programDescription: program.description,
        startTime: program.startTime,
        endTime: program.endTime,
      });
      setToastMessage("Reminder is added");
    }
    setToastVisible(true);
  };

  const progress = getProgress(program);
  const isPast = progress === 2;
  const isCurrent = progress >= 0 && progress <= 1;
  const isFuture = progress === -1;

  const progressPct = isCurrent ? Math.round(progress * 100) : 0;
  const elapsed = isCurrent ? Math.round((Date.now() - program.startTime) / 60000) : 0;
  const remaining = isCurrent ? Math.round((program.endTime - Date.now()) / 60000) : 0;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 16 }]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Program state badge */}
          <View style={styles.badgeRow}>
            {isPast && (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>PAST</Text>
              </View>
            )}
            {isCurrent && (
              <View style={[styles.badge, { backgroundColor: "#1a3a1a" }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.badgeText, { color: "#4caf50" }]}>LIVE NOW</Text>
              </View>
            )}
            {isFuture && (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Feather name="calendar" size={11} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>UPCOMING</Text>
              </View>
            )}
            <Text style={[styles.channelLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
              {channel.name}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {program.title}
          </Text>

          {/* Time info */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.primary }]}>
              {formatDate(program.startTime)} · {formatTime(program.startTime)} – {formatTime(program.endTime)}
            </Text>
            <Text style={[styles.duration, { color: colors.mutedForeground }]}>
              {formatDuration(program.startTime, program.endTime)}
            </Text>
          </View>

          {/* Progress bar for current programs */}
          {isCurrent && (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: colors.progressBg }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${progressPct}%` as any },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  {elapsed} min elapsed
                </Text>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  {remaining} min left
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {program.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={3}>
              {program.description}
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Action buttons */}
          <View style={styles.actions}>
            {(isCurrent || isPast) && (
              <>
                {isCurrent && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onWatchLive(channel);
                      onClose();
                    }}
                    style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                  >
                    <Feather name="play" size={16} color="#fff" />
                    <Text style={styles.primaryActionText}>Watch Live</Text>
                  </TouchableOpacity>
                )}

                {/* Catch-Up button for past and current programs */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onWatchCatchUp(channel, program);
                    onClose();
                  }}
                  style={[
                    styles.catchUpAction,
                    {
                      backgroundColor: isCurrent ? colors.secondary : colors.primary,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Feather name="rotate-ccw" size={16} color={isCurrent ? colors.foreground : "#fff"} />
                  <Text style={[styles.catchUpText, { color: isCurrent ? colors.foreground : "#fff" }]}>
                    {isCurrent ? "Watch from Start" : "Watch Catch-Up"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isFuture && (
              <>
                <View style={[styles.futureInfo, { backgroundColor: colors.secondary }]}>
                  <Feather name="clock" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.futureText, { color: colors.mutedForeground }]}>
                    Starts in {Math.round((program.startTime - Date.now()) / 60000)} minutes
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleReminder}
                  style={[
                    styles.remindAction,
                    {
                      backgroundColor: existingReminder ? `${colors.primary}20` : colors.secondary,
                      borderColor: existingReminder ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Feather
                    name={existingReminder ? "bell" : "bell"}
                    size={16}
                    color={existingReminder ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.remindText, { color: existingReminder ? colors.primary : colors.mutedForeground }]}>
                    {existingReminder ? "Reminder set" : "Remind me"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        icon="bell"
        onHide={() => setToastVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4caf50",
  },
  channelLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    lineHeight: 26,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  duration: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressSection: {
    marginBottom: 14,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  catchUpAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  catchUpText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  futureInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  futureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  remindAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  remindText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
