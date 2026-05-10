import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
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

interface CustomRecordingSheetProps {
  channel: Channel | null;
  program: EPGProgram | null;
  visible: boolean;
  onClose: () => void;
  onNewRecording: () => void;
  onAllRecordings: () => void;
}

export function CustomRecordingSheet({
  channel,
  program,
  visible,
  onClose,
  onNewRecording,
  onAllRecordings,
}: CustomRecordingSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!channel) return null;

  const options = [
    {
      label: "New recording",
      icon: "plus-circle" as const,
      action: () => {
        Haptics.selectionAsync();
        onNewRecording();
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
  ];

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
            <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 8 }]}>
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.foreground }]}>Custom recording</Text>
                {program && (
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {program.title}
                  </Text>
                )}
              </View>

              {options.map((opt, i) => (
                <TouchableOpacity
                  key={opt.label}
                  onPress={opt.action}
                  style={[
                    styles.option,
                    i < options.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather name={opt.icon} size={18} color={colors.foreground} style={styles.optIcon} />
                  <Text style={[styles.optLabel, { color: colors.foreground }]}>{opt.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
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
});
