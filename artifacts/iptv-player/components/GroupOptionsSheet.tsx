import { Feather } from "@expo/vector-icons";
import React from "react";
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

import { useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface GroupOptionsSheetProps {
  group: string | null;
  visible: boolean;
  onClose: () => void;
}

export function GroupOptionsSheet({ group, visible, onClose }: GroupOptionsSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favoritesOnlyGroups, toggleFavoritesOnlyGroup } = useIPTV();

  if (!group) return null;

  const isFavOnly = favoritesOnlyGroups.includes(group);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
                  {group}
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Group Options
                </Text>
              </View>

              <View style={styles.body}>
                <TouchableOpacity
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => toggleFavoritesOnlyGroup(group)}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                      <Feather name="star" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Show only favorites
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                        Only display channels you've starred in this group
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isFavOnly}
                    onValueChange={() => toggleFavoritesOnlyGroup(group)}
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={isFavOnly ? colors.primary : colors.mutedForeground}
                    ios_backgroundColor={colors.border}
                  />
                </TouchableOpacity>

                <View style={[styles.optionRow, { borderBottomColor: colors.border, opacity: 0.45 }]}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.foreground}10` }]}>
                      <Feather name="list" size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Sort channels
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                        By name, number, or custom order
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.comingSoon, { color: colors.mutedForeground }]}>Soon</Text>
                </View>

                <View style={[styles.optionRow, { borderBottomColor: colors.border, opacity: 0.45 }]}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.foreground}10` }]}>
                      <Feather name="tv" size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                        Default player
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                        Override default video player for this group
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.comingSoon, { color: colors.mutedForeground }]}>Soon</Text>
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
  header: {
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
  optionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  comingSoon: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
