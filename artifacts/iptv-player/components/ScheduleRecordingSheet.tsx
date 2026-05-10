import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface ScheduleRecordingSheetProps {
  channel: Channel | null;
  program: EPGProgram | null;
  visible: boolean;
  onClose: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getRecordingStatus(startTime: number, endTime: number, now: number) {
  if (endTime < now) return "past";
  if (startTime <= now) return "recording";
  return "scheduled";
}

export function ScheduleRecordingSheet({ channel, program, visible, onClose }: ScheduleRecordingSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { scheduleRecording, recordings } = useIPTV();
  const [confirmed, setConfirmed] = useState(false);

  const now = Date.now();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!visible) setConfirmed(false);
  }, [visible]);

  if (!channel || !program) return null;

  const status = getRecordingStatus(program.startTime, program.endTime, now);
  const alreadyRecording = recordings.some(
    (r) => r.channelId === channel.id && r.startTime === program.startTime
  );

  const effectiveStart = status === "recording" ? now : program.startTime;

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scheduleRecording({
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo,
      channelGroup: channel.group,
      programTitle: program.title,
      programDescription: program.description,
      startTime: effectiveStart,
      endTime: program.endTime,
      url: channel.url,
    });
    setConfirmed(true);
    setTimeout(() => onClose(), 1400);
  };

  const statusColor =
    status === "recording" ? "#f44336" :
    status === "scheduled" ? colors.primary :
    colors.mutedForeground;

  const statusLabel =
    status === "recording" ? "LIVE · Recording now" :
    status === "scheduled" ? `Scheduled · ${formatDate(program.startTime)}` :
    "Past program";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 12 }]}>
              {confirmed ? (
                <View style={styles.successState}>
                  <View style={[styles.successIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Feather name="check-circle" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.foreground }]}>Recording Scheduled</Text>
                  <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                    {program.title}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={[styles.recDot, { backgroundColor: "#f44336" }]} />
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>Schedule Recording</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Feather name="x" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.body}>
                    <View style={[styles.channelRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <View style={[styles.channelIconBg, { backgroundColor: colors.muted }]}>
                        <Feather name="tv" size={18} color={colors.mutedForeground} />
                      </View>
                      <View style={styles.channelInfo}>
                        <Text style={[styles.channelName, { color: colors.foreground }]} numberOfLines={1}>
                          {channel.name}
                        </Text>
                        <Text style={[styles.channelGroup, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {channel.group}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { borderColor: statusColor }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>

                    <View style={[styles.programCard, { backgroundColor: colors.highlight, borderColor: colors.border }]}>
                      <Text style={[styles.programTitle, { color: colors.foreground }]} numberOfLines={2}>
                        {program.title}
                      </Text>
                      {program.description ? (
                        <Text style={[styles.programDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {program.description}
                        </Text>
                      ) : null}

                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Start</Text>
                          <Text style={[styles.timeValue, { color: colors.foreground }]}>
                            {formatTime(effectiveStart)}
                          </Text>
                        </View>
                        <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
                        <View style={styles.timeItem}>
                          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>End</Text>
                          <Text style={[styles.timeValue, { color: colors.foreground }]}>
                            {formatTime(program.endTime)}
                          </Text>
                        </View>
                        <View style={styles.timeItem}>
                          <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Duration</Text>
                          <Text style={[styles.timeValue, { color: colors.foreground }]}>
                            {formatDuration(effectiveStart, program.endTime)}
                          </Text>
                        </View>
                      </View>

                      {status === "recording" && (
                        <View style={styles.liveNote}>
                          <Feather name="info" size={12} color={colors.mutedForeground} />
                          <Text style={[styles.liveNoteText, { color: colors.mutedForeground }]}>
                            Recording will start from now and run to program end
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {alreadyRecording ? (
                      <View style={[styles.alreadyBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                        <Feather name="check" size={14} color={colors.primary} />
                        <Text style={[styles.alreadyText, { color: colors.primary }]}>Already scheduled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={handleConfirm}
                        style={[styles.confirmBtn, { backgroundColor: "#f44336" }]}
                        activeOpacity={0.85}
                      >
                        <Feather name="circle" size={14} color="#fff" />
                        <Text style={styles.confirmText}>
                          {status === "recording" ? "Record Now" : "Schedule Recording"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={onClose}
                      style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  channelIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  channelInfo: {
    flex: 1,
    gap: 2,
  },
  channelName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  channelGroup: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  programCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  programTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  programDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  timeItem: {
    gap: 2,
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  liveNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  liveNoteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 15,
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  alreadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  alreadyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  successState: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  successSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
