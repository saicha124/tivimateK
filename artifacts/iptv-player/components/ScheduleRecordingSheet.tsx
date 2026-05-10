import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

const DISMISSED_KEY = "recordingWarningDismissed";

interface ScheduleRecordingSheetProps {
  channel: Channel | null;
  program: EPGProgram | null;
  visible: boolean;
  onClose: () => void;
  onGoToSettings?: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ScheduleRecordingSheet({
  channel,
  program,
  visible,
  onClose,
  onGoToSettings,
}: ScheduleRecordingSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scheduleRecording, recordings } = useIPTV();

  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const now = Date.now();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!visible) {
      setConfirmed(false);
      setDontShowAgain(false);
    }
  }, [visible]);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      if (val === "true") setWarningDismissed(true);
    });
  }, []);

  if (!channel || !program) return null;

  const isLive = program.startTime <= now && program.endTime >= now;
  const effectiveStart = isLive ? now : program.startTime;

  const alreadyRecording = recordings.some(
    (r) => r.channelId === channel.id && r.startTime === program.startTime
  );

  const handleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (dontShowAgain) {
      AsyncStorage.setItem(DISMISSED_KEY, "true");
      setWarningDismissed(true);
    }
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
    setTimeout(() => onClose(), 1200);
  };

  const handleSettings = () => {
    onClose();
    if (onGoToSettings) {
      onGoToSettings();
    } else {
      router.push("/settings" as any);
    }
  };

  if (alreadyRecording) {
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
              <View style={[styles.dialog, { backgroundColor: colors.card, paddingBottom: bottomPad + 12 }]}>
                <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Already scheduled</Text>
                <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
                  {program.title} is already scheduled to record on {channel.name}.
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.btnText, { color: colors.foreground }]}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

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
            {confirmed ? (
              <View style={[styles.dialog, { backgroundColor: colors.card, paddingBottom: bottomPad + 16, alignItems: "center", gap: 12 }]}>
                <View style={[styles.successIcon, { backgroundColor: "#f4433618" }]}>
                  <View style={styles.recDotLarge} />
                </View>
                <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
                  {isLive ? "Recording started" : "Recording scheduled"}
                </Text>
                <Text style={[styles.dialogBody, { color: colors.mutedForeground, textAlign: "center" }]}>
                  {program.title}
                  {"\n"}
                  {formatTime(effectiveStart)} – {formatTime(program.endTime)} · {formatDuration(effectiveStart, program.endTime)}
                </Text>
              </View>
            ) : (
              <View style={[styles.dialog, { backgroundColor: colors.card, paddingBottom: bottomPad + 12 }]}>
                <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
                  {warningDismissed ? `Record: ${program.title}` : "Recording"}
                </Text>

                {!warningDismissed ? (
                  <>
                    <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
                      Recording may not work on all channels and may require more than one server connection. You can change the folder for recording files in the settings.
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        const next = !dontShowAgain;
                        setDontShowAgain(next);
                      }}
                      style={styles.checkRow}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: dontShowAgain ? colors.primary : "transparent",
                          borderColor: dontShowAgain ? colors.primary : colors.mutedForeground,
                        },
                      ]}>
                        {dontShowAgain && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[styles.checkLabel, { color: colors.foreground }]}>Don't show again</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
                    {channel.name} · {formatTime(effectiveStart)} – {formatTime(program.endTime)} · {formatDuration(effectiveStart, program.endTime)}
                  </Text>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    onPress={handleRecord}
                    style={[styles.btn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.btnText, { color: colors.foreground }]}>Record</Text>
                  </TouchableOpacity>

                  {!warningDismissed && (
                    <TouchableOpacity
                      onPress={handleSettings}
                      style={[styles.btn, { backgroundColor: "transparent" }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Settings</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.btn, { backgroundColor: "transparent" }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dialog: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  dialogBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  btnRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  btnPrimary: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  recDotLarge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f44336",
  },
});
