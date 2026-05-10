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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIPTV } from "@/context/IPTVContext";
import { useParental } from "@/context/ParentalContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function GroupLockModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activePlaylist } = useIPTV();
  const { lockedGroups, lockGroup, unlockGroup } = useParental();

  const groups = useMemo(() => {
    if (!activePlaylist) return [];
    return Array.from(new Set(activePlaylist.channels.map((c) => c.group))).sort();
  }, [activePlaylist]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 16 }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>Manage Locked Groups</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Locked groups require PIN to view. Toggle to lock or unlock each group.
          </Text>

          <FlatList
            data={groups}
            keyExtractor={(g) => g}
            style={styles.list}
            scrollEnabled={groups.length > 6}
            renderItem={({ item: group }) => {
              const isLocked = lockedGroups.includes(group);
              return (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (isLocked) {
                      unlockGroup(group);
                    } else {
                      lockGroup(group);
                    }
                  }}
                  style={[
                    styles.groupRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isLocked ? `${colors.destructive}15` : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={isLocked ? "lock" : "unlock"}
                    size={16}
                    color={isLocked ? colors.destructive : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.groupName,
                      { color: isLocked ? colors.foreground : colors.mutedForeground },
                      isLocked && { fontFamily: "Inter_600SemiBold" },
                    ]}
                    numberOfLines={1}
                  >
                    {group}
                  </Text>
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: isLocked ? colors.destructive : colors.secondary,
                        borderColor: isLocked ? colors.destructive : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        {
                          backgroundColor: "#fff",
                          transform: [{ translateX: isLocked ? 18 : 2 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No groups available. Add a playlist first.
                </Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginBottom: 16,
  },
  list: {
    maxHeight: 400,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  empty: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
