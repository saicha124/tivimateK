import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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

import { CatchUpSheet } from "@/components/CatchUpSheet";
import { Channel, EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface ChannelContextMenuProps {
  channel: Channel | null;
  visible: boolean;
  onClose: () => void;
  onPlay: (channel: Channel) => void;
  onCatchUp: (channel: Channel, program: EPGProgram) => void;
}

interface MenuOption {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  action: () => void;
  dividerBefore?: boolean;
}

export function ChannelContextMenu({ channel, visible, onClose, onPlay, onCatchUp }: ChannelContextMenuProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite, blockedChannels, toggleBlockChannel, hiddenChannels, toggleHideChannel } = useIPTV();
  const [showCatchUp, setShowCatchUp] = useState(false);

  if (!channel) return null;

  const isFav = favorites.includes(channel.id);
  const isBlocked = blockedChannels.includes(channel.id);
  const isHidden = hiddenChannels.includes(channel.id);
  const hasCatchUp = (channel.epg ?? []).some((p) => p.startTime < Date.now());

  const options: MenuOption[] = [
    {
      label: "Play",
      icon: "play-circle",
      color: colors.primary,
      action: () => {
        onClose();
        onPlay(channel);
      },
    },
    {
      label: "Catch-Up / Replay",
      icon: "rotate-ccw",
      color: hasCatchUp ? colors.foreground : colors.mutedForeground,
      action: () => {
        if (!hasCatchUp) return;
        setShowCatchUp(true);
      },
      dividerBefore: true,
    },
    {
      label: "Open in external player",
      icon: "external-link",
      action: () => { onClose(); },
    },
    {
      label: "Record",
      icon: "circle",
      color: "#f44336",
      action: () => { onClose(); },
    },
    {
      label: "Custom recording",
      icon: "video",
      action: () => { onClose(); },
    },
    {
      label: isFav ? "Remove from My List" : "Add to My List",
      icon: "bookmark",
      color: isFav ? colors.primary : undefined,
      action: () => {
        Haptics.selectionAsync();
        toggleFavorite(channel.id);
        onClose();
      },
      dividerBefore: true,
    },
    {
      label: "Program description",
      icon: "info",
      action: () => { onClose(); },
    },
    {
      label: isBlocked ? "Unblock channel" : "Block channel",
      icon: "slash",
      color: isBlocked ? colors.primary : colors.destructive,
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleBlockChannel(channel.id);
        onClose();
      },
      dividerBefore: true,
    },
    {
      label: isHidden ? "Show channel" : "Hide channel",
      icon: isHidden ? "eye" : "eye-off",
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleHideChannel(channel.id);
        onClose();
      },
    },
    {
      label: "Assign EPG",
      icon: "calendar",
      action: () => { onClose(); },
    },
    {
      label: "Channel options",
      icon: "sliders",
      action: () => { onClose(); },
    },
  ];

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Modal
        visible={visible && !showCatchUp}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 8 }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.channelTitle, { color: colors.primary }]} numberOfLines={1}>
                    {channel.name}
                  </Text>
                  {channel.group ? (
                    <Text style={[styles.groupLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {channel.group}
                    </Text>
                  ) : null}
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {options.map((opt) => (
                    <React.Fragment key={opt.label}>
                      {opt.dividerBefore && (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      )}
                      <TouchableOpacity
                        onPress={opt.action}
                        style={styles.option}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={opt.icon}
                          size={18}
                          color={opt.color ?? colors.foreground}
                          style={styles.optionIcon}
                        />
                        <Text style={[styles.optionLabel, { color: opt.color ?? colors.foreground }]}>
                          {opt.label}
                        </Text>
                        {opt.label === "Catch-Up / Replay" && hasCatchUp && (
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CatchUpSheet
        channel={channel}
        visible={showCatchUp}
        onClose={() => {
          setShowCatchUp(false);
          onClose();
        }}
        onPlay={(ch, program) => {
          setShowCatchUp(false);
          onClose();
          onCatchUp(ch, program);
        }}
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
    maxHeight: "80%",
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  channelTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginHorizontal: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  optionIcon: {
    width: 22,
    textAlign: "center",
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
