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

import { PinPad } from "@/components/PinPad";
import { Channel, VODItem, useIPTV } from "@/context/IPTVContext";
import { useParental } from "@/context/ParentalContext";
import { useColors } from "@/hooks/useColors";

function getGroups(
  section: string,
  channels: Channel[],
  movies: VODItem[],
  shows: VODItem[]
): string[] {
  if (section === "My List") return ["Favorites"];
  if (section === "Movies") return Array.from(new Set(movies.map((m) => m.category))).sort();
  if (section === "Shows") return Array.from(new Set(shows.map((s) => s.category))).sort();
  if (section === "TV") return Array.from(new Set(channels.map((c) => c.group))).sort();
  return [];
}

export function GroupList() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activePlaylist, currentSection, selectedGroup, setSelectedGroup, setSelectedChannel } = useIPTV();
  const { isGroupLocked, unlockForSession, verifyPin } = useParental();

  const [pendingGroup, setPendingGroup] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  const groups = useMemo(
    () => getGroups(
      currentSection,
      activePlaylist?.channels ?? [],
      activePlaylist?.movies ?? [],
      activePlaylist?.shows ?? []
    ),
    [currentSection, activePlaylist]
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

  const handlePinSuccess = () => {
    if (pendingGroup) {
      unlockForSession(pendingGroup);
      setSelectedGroup(pendingGroup);
      setSelectedChannel(null);
    }
    setShowPin(false);
    setPendingGroup(null);
  };

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
        data={groups}
        keyExtractor={(item) => item}
        scrollEnabled={groups.length > 0}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: group }) => {
          const active = selectedGroup === group;
          const locked = isGroupLocked(group);

          return (
            <TouchableOpacity
              onPress={() => handleSelect(group)}
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
