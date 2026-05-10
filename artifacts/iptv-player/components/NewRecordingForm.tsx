import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

type RepeatMode = "off" | "daily" | "weekly";

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: "Off",
  daily: "Daily",
  weekly: "Weekly",
};

function formatDateStr(date: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTimeStr(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface NewRecordingFormProps {
  visible: boolean;
  channel: Channel | null;
  program: EPGProgram | null;
  onClose: () => void;
  onScheduled: () => void;
}

export function NewRecordingForm({
  visible,
  channel,
  program,
  onClose,
  onScheduled,
}: NewRecordingFormProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { addScheduledCustomRecording } = useIPTV();

  const now = new Date();
  const defaultDate = program ? new Date(program.startTime) : now;
  const programDurationMs = program ? program.endTime - program.startTime : 3600000;
  const defaultDurH = Math.floor(programDurationMs / 3600000);
  const defaultDurM = Math.floor((programDurationMs % 3600000) / 60000);

  const [startDate] = useState(defaultDate);
  const [startTime] = useState(defaultDate);
  const [durationH, setDurationH] = useState(Math.max(defaultDurH, 1));
  const [durationM, setDurationM] = useState(defaultDurM);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [name, setName] = useState(program?.title ?? channel?.name ?? "Custom Recording");
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);

  if (!channel) return null;

  const handleSchedule = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addScheduledCustomRecording({
      channelId: channel.id,
      channelName: channel.name,
      channelLogo: channel.logo,
      startDate: startDate.toISOString(),
      startTime: formatTimeStr(startTime),
      durationHours: durationH,
      durationMinutes: durationM,
      repeat,
      name,
    });
    onScheduled();
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.sidebar, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New recording</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: bottomPad + 32 }}>
          <View style={[styles.channelRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.channelDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.channelName, { color: colors.foreground }]}>{channel.name}</Text>
          </View>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Start date</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{formatDateStr(startDate)}</Text>
          </View>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Start time</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{formatTimeStr(startTime)}</Text>
          </View>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Duration</Text>
            <View style={styles.durationRow}>
              <View style={styles.stepperGroup}>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setDurationH(Math.max(0, durationH - 1)); }}
                  style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="minus" size={14} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: colors.foreground }]}>{durationH}h</Text>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setDurationH(Math.min(23, durationH + 1)); }}
                  style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="plus" size={14} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.stepperGroup}>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setDurationM(durationM === 0 ? 55 : durationM - 5); }}
                  style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="minus" size={14} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: colors.foreground }]}>{durationM}m</Text>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setDurationM(durationM === 55 ? 0 : durationM + 5); }}
                  style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                >
                  <Feather name="plus" size={14} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => setShowRepeatPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Repeat</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.value, { color: colors.foreground }]}>{REPEAT_LABELS[repeat]}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>

          <View style={[styles.nameSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.nameInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
              placeholderTextColor={colors.mutedForeground}
              placeholder="Recording name"
            />
          </View>

          <TouchableOpacity
            onPress={handleSchedule}
            style={[styles.scheduleBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="circle" size={16} color="#fff" />
            <Text style={styles.scheduleBtnText}>Schedule recording</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={showRepeatPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRepeatPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowRepeatPicker(false)}>
            <View style={styles.pickerOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
                  <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Repeat</Text>
                  {(["off", "daily", "weekly"] as RepeatMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRepeat(mode);
                        setShowRepeatPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{REPEAT_LABELS[mode]}</Text>
                      {repeat === mode && <Feather name="check" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  form: { flex: 1 },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  channelDot: { width: 8, height: 8, borderRadius: 4 },
  channelName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 14, fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, fontFamily: "Inter_500Medium" },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationRow: { flexDirection: "row", gap: 16 },
  stepperGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    minWidth: 38,
    textAlign: "center",
  },
  nameSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  nameInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderBottomWidth: 2,
    paddingBottom: 6,
  },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 20,
    marginTop: 32,
    height: 50,
    borderRadius: 10,
  },
  scheduleBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
