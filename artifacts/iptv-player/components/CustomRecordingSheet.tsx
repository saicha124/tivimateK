import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";
import { NewRecordingForm } from "./NewRecordingForm";

interface CustomRecordingSheetProps {
  channel: Channel | null;
  program: EPGProgram | null;
  visible: boolean;
  onClose: () => void;
  onNewRecording?: () => void;
  onAllRecordings: () => void;
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Feather name="check-circle" size={16} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function CustomRecordingSheet({
  channel,
  program,
  visible,
  onClose,
  onAllRecordings,
}: CustomRecordingSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { scheduledCustomRecordings, removeScheduledCustomRecording } = useIPTV();

  const [showNewForm, setShowNewForm] = useState(false);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [showToast, setShowToast] = useState(false);

  if (!channel) return null;

  const channelScheduled = scheduledCustomRecordings.filter((r) => r.channelId === channel.id);

  const handleScheduled = () => {
    setShowNewForm(false);
    setShowToast(false);
    setTimeout(() => setShowToast(true), 100);
  };

  const repeatLabel = (r: string) =>
    r === "daily" ? " · Daily" : r === "weekly" ? " · Weekly" : "";

  const mainOptions = [
    {
      label: "New recording",
      icon: "plus-circle" as const,
      action: () => {
        Haptics.selectionAsync();
        setShowNewForm(true);
      },
    },
    {
      label: "All recordings",
      icon: "video" as const,
      action: () => {
        Haptics.selectionAsync();
        onAllRecordings();
      },
    },
    {
      label: `Scheduled recordings${channelScheduled.length > 0 ? ` (${channelScheduled.length})` : ""}`,
      icon: "clock" as const,
      action: () => {
        Haptics.selectionAsync();
        setShowScheduledList((v) => !v);
      },
    },
  ];

  return (
    <>
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
              <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 8 }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.title, { color: colors.foreground }]}>Custom recording</Text>
                  {program && (
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {program.title}
                    </Text>
                  )}
                </View>

                {mainOptions.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={opt.action}
                    style={[
                      styles.option,
                      i < mainOptions.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Feather name={opt.icon} size={18} color={colors.foreground} style={styles.optIcon} />
                    <Text style={[styles.optLabel, { color: colors.foreground }]}>{opt.label}</Text>
                    {opt.icon === "clock" ? (
                      <Feather name={showScheduledList ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    ) : (
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    )}
                  </TouchableOpacity>
                ))}

                {showScheduledList && (
                  <View style={[styles.scheduledSection, { borderTopColor: colors.border }]}>
                    {channelScheduled.length === 0 ? (
                      <Text style={[styles.noScheduled, { color: colors.mutedForeground }]}>
                        No scheduled recordings for this channel
                      </Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 220 }}>
                        {channelScheduled.map((rec) => (
                          <View key={rec.id} style={[styles.schedRow, { borderBottomColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.schedName, { color: colors.foreground }]} numberOfLines={1}>
                                {rec.name}
                              </Text>
                              <Text style={[styles.schedTime, { color: colors.mutedForeground }]}>
                                {new Date(rec.startDate).toLocaleDateString()} · {rec.startTime}
                                {" · "}{rec.durationHours}h {rec.durationMinutes}m
                                {repeatLabel(rec.repeat)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.selectionAsync();
                                removeScheduledCustomRecording(rec.id);
                              }}
                              style={styles.schedDelete}
                            >
                              <Feather name="trash-2" size={16} color="#f44336" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                <Toast message="Recording is scheduled" visible={showToast} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <NewRecordingForm
        visible={showNewForm}
        channel={channel}
        program={program}
        onClose={() => setShowNewForm(false)}
        onScheduled={handleScheduled}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  optIcon: {
    width: 22,
    textAlign: "center",
  },
  optLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  scheduledSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  noScheduled: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  schedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  schedName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  schedTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  schedDelete: {
    padding: 8,
  },
  toast: {
    position: "absolute",
    bottom: 12,
    left: 20,
    right: 20,
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
});
