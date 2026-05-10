import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GroupContextMenu } from "@/components/GroupContextMenu";
import { GroupOptionsSheet } from "@/components/GroupOptionsSheet";
import { PinPad } from "@/components/PinPad";
import { Channel, VODItem, useIPTV } from "@/context/IPTVContext";
import { useParental } from "@/context/ParentalContext";
import { useColors } from "@/hooks/useColors";

function getGroups(
  section: string,
  channels: Channel[],
  movies: VODItem[],
  shows: VODItem[],
  hiddenGroups: string[]
): string[] {
  if (section === "My List") return ["Favorites"];
  let groups: string[] = [];
  if (section === "Movies") groups = Array.from(new Set(movies.map((m) => m.category))).sort();
  else if (section === "Shows") groups = Array.from(new Set(shows.map((s) => s.category))).sort();
  else if (section === "TV") groups = Array.from(new Set(channels.map((c) => c.group))).sort();
  return groups.filter((g) => !hiddenGroups.includes(g));
}

export function GroupList({
  onManageFavorites,
}: {
  onManageFavorites?: (group: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    activePlaylist,
    currentSection,
    selectedGroup,
    setSelectedGroup,
    setSelectedChannel,
    favorites,
    hiddenGroups,
    favoritesOnlyGroups,
  } = useIPTV();
  const { isGroupLocked, unlockForSession, verifyPin } = useParental();

  const [pendingGroup, setPendingGroup] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [contextGroup, setContextGroup] = useState<string | null>(null);
  const [groupOptionsGroup, setGroupOptionsGroup] = useState<string | null>(null);

  const hasFavorites = favorites.length > 0 && currentSection === "TV";

  const groups = useMemo(
    () => getGroups(
      currentSection,
      activePlaylist?.channels ?? [],
      activePlaylist?.movies ?? [],
      activePlaylist?.shows ?? [],
      hiddenGroups
    ),
    [currentSection, activePlaylist, hiddenGroups]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSelect = (group: string) => {
    if (isGroupLocked(group)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setPendingGroup(group);
      setShowPin(true);
    } else {
      Haptics.selectionAsync();
      setSelectedGroup(group);
      setSelectedChannel(null);
    }
  };

  const handleLongPress = (group: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextGroup(group);
  };

  const handlePinSuccess = () => {
    if (pendingGroup) {
      unlockForSession(pendingGroup);
      setSelectedGroup(pendingGroup);
      setSelectedChannel(null);
    }
    setShowPin(false);
    setPendingGroup(null);
  };

  const listData = useMemo(() => {
    const items: Array<{ key: string; isFavHeader?: boolean }> = [];
    if (hasFavorites) items.push({ key: "__favorites__", isFavHeader: true });
    groups.forEach((g) => items.push({ key: g }));
    return items;
  }, [groups, hasFavorites]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRightColor: colors.border,
          paddingTop: topPad + 8,
        },
      ]}
    >
      <Text style={[styles.header, { color: colors.mutedForeground }]}>
        {currentSection.toUpperCase()}
      </Text>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        scrollEnabled={listData.length > 0}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.isFavHeader) {
            const active = selectedGroup === "__favorites__";
            return (
              <TouchableOpacity
                onPress={() => handleSelect("__favorites__")}
                style={[
                  styles.groupItem,
                  active && { backgroundColor: colors.highlight },
                ]}
                activeOpacity={0.7}
              >
                <Feather name="star" size={12} color="#FFC107" style={{ marginRight: 4 }} />
                <Text
                  style={[
                    styles.groupText,
                    {
                      color: active ? colors.primary : colors.foreground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                      flex: 1,
                    },
                  ]}
                >
                  Favorites
                </Text>
              </TouchableOpacity>
            );
          }

          const group = item.key;
          const active = selectedGroup === group;
          const locked = isGroupLocked(group);
          const favOnly = favoritesOnlyGroups.includes(group);

          return (
            <TouchableOpacity
              onPress={() => handleSelect(group)}
              onLongPress={() => handleLongPress(group)}
              style={[
                styles.groupItem,
                active && { backgroundColor: colors.highlight },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.groupText,
                  {
                    color: active ? colors.primary : locked ? colors.mutedForeground : colors.foreground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    flex: 1,
                  },
                ]}
                numberOfLines={2}
              >
                {group}
              </Text>
              {favOnly && (
                <Feather name="star" size={11} color="#FFC107" style={{ marginLeft: 2 }} />
              )}
              {locked && (
                <Feather name="lock" size={12} color={colors.destructive} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No groups</Text>
          </View>
        }
      />

      <PinPad
        visible={showPin}
        title="Group Locked"
        subtitle={pendingGroup ? `Enter PIN to access\n"${pendingGroup}"` : undefined}
        onSuccess={handlePinSuccess}
        onCancel={() => { setShowPin(false); setPendingGroup(null); }}
        onVerify={verifyPin}
      />

      <GroupContextMenu
        group={contextGroup}
        visible={!!contextGroup}
        onClose={() => setContextGroup(null)}
        onManageFavorites={(g) => { onManageFavorites?.(g); }}
        onGroupOptions={(g) => setGroupOptionsGroup(g)}
      />

      <GroupOptionsSheet
        group={groupOptionsGroup}
        visible={!!groupOptionsGroup}
        onClose={() => setGroupOptionsGroup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    borderRightWidth: 1,
  },
  header: {
    fontSize: 10,
    letterSpacing: 1.5,
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    marginHorizontal: 4,
    marginBottom: 1,
  },
  groupText: {
    fontSize: 13,
  },
  empty: { padding: 16 },
  emptyText: { fontSize: 13 },
});
