import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GroupSortOrder, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface GroupOptionsSheetProps {
  group: string | null;
  visible: boolean;
  onClose: () => void;
}

const SORT_OPTIONS: { value: GroupSortOrder; label: string; desc: string }[] = [
  { value: "playlist", label: "By order in playlist", desc: "Original playlist order" },
  { value: "name-asc", label: "By name A–Z", desc: "Alphabetical ascending" },
  { value: "name-desc", label: "By name Z–A", desc: "Alphabetical descending" },
];

export function GroupOptionsSheet({ group, visible, onClose }: GroupOptionsSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    favoritesOnlyGroups,
    toggleFavoritesOnlyGroup,
    groupSortOrders,
    setGroupSortOrder,
    groupEpgOffsets,
    setGroupEpgOffset,
    groupExternalPlayer,
    toggleGroupExternalPlayer,
  } = useIPTV();

  const [showSortPicker, setShowSortPicker] = useState(false);

  if (!group) return null;

  const isFavOnly = favoritesOnlyGroups.includes(group);
  const sortOrder: GroupSortOrder = groupSortOrders[group] ?? "playlist";
  const epgOffset = groupEpgOffsets[group] ?? 0;
  const useExternal = groupExternalPlayer.includes(group);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? "By order in playlist";

  const adjustEpgOffset = (delta: number) => {
    Haptics.selectionAsync();
    const next = Math.max(-12, Math.min(12, epgOffset + delta));
    setGroupEpgOffset(group, next);
  };

  const formatOffset = (offset: number) => {
    if (offset === 0) return "0:00";
    const sign = offset > 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${sign}${h}:${m.toString().padStart(2, "0")}`;
  };

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
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
                  {group}
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Group Options
                </Text>
              </View>

              <View style={styles.body}>
                {/* Channels sorting */}
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowSortPicker(!showSortPicker);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                      <Feather name="bar-chart-2" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Channels sorting
                      </Text>
                      <Text style={[styles.optionValue, { color: colors.mutedForeground }]}>
                        {sortLabel}
                      </Text>
                    </View>
                  </View>
                  <Feather
                    name={showSortPicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>

                {showSortPicker && (
                  <View style={[styles.sortPicker, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    {SORT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.sortOption,
                          { borderBottomColor: colors.border },
                          opt.value === sortOrder && { backgroundColor: `${colors.primary}15` },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setGroupSortOrder(group, opt.value);
                          setShowSortPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sortOptionContent}>
                          <Text style={[styles.sortOptionLabel, { color: opt.value === sortOrder ? colors.primary : colors.foreground }]}>
                            {opt.label}
                          </Text>
                          <Text style={[styles.sortOptionDesc, { color: colors.mutedForeground }]}>
                            {opt.desc}
                          </Text>
                        </View>
                        {opt.value === sortOrder && (
                          <Feather name="check" size={15} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Show favorites only */}
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    toggleFavoritesOnlyGroup(group);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                      <Feather name="star" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Show Favorites only
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isFavOnly}
                    onValueChange={() => {
                      Haptics.selectionAsync();
                      toggleFavoritesOnlyGroup(group);
                    }}
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={isFavOnly ? colors.primary : colors.mutedForeground}
                    ios_backgroundColor={colors.border}
                  />
                </TouchableOpacity>

                {/* Use external player */}
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    toggleGroupExternalPlayer(group);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.foreground}10` }]}>
                      <Feather name="external-link" size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Use external player
                      </Text>
                      <Text style={[styles.optionValue, { color: colors.mutedForeground }]}>
                        {useExternal ? "Yes" : "No"}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={useExternal}
                    onValueChange={() => {
                      Haptics.selectionAsync();
                      toggleGroupExternalPlayer(group);
                    }}
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={useExternal ? colors.primary : colors.mutedForeground}
                    ios_backgroundColor={colors.border}
                  />
                </TouchableOpacity>

                {/* EPG time offset */}
                <View style={[styles.optionRow, { borderBottomColor: "transparent" }]}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.foreground}10` }]}>
                      <Feather name="clock" size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        EPG time offset, h:min
                      </Text>
                      <Text style={[styles.optionValue, { color: colors.mutedForeground }]}>
                        {formatOffset(epgOffset)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      onPress={() => adjustEpgOffset(-0.5)}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: colors.foreground }]}>
                      {formatOffset(epgOffset)}
                    </Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      onPress={() => adjustEpgOffset(0.5)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Done</Text>
              </TouchableOpacity>
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
  sheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  body: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  optionValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  sortPicker: {
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sortOptionContent: { flex: 1 },
  sortOptionLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sortOptionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    minWidth: 40,
    textAlign: "center",
  },
  closeBtn: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
