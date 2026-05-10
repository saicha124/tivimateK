import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, VODItem, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

function getGroups(
  section: string,
  channels: Channel[],
  movies: VODItem[],
  shows: VODItem[],
  favorites: string[],
  favoriteChannels: Channel[]
): string[] {
  if (section === "My List") return ["Favorites"];
  if (section === "Movies") {
    const cats = Array.from(new Set(movies.map((m) => m.category)));
    return cats.sort();
  }
  if (section === "Shows") {
    const cats = Array.from(new Set(shows.map((s) => s.category)));
    return cats.sort();
  }
  if (section === "TV") {
    const groups = Array.from(new Set(channels.map((c) => c.group)));
    return groups.sort();
  }
  return [];
}

export function GroupList() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    activePlaylist,
    currentSection,
    selectedGroup,
    setSelectedGroup,
    favorites,
    setSelectedChannel,
  } = useIPTV();

  const channels = activePlaylist?.channels ?? [];
  const movies = activePlaylist?.movies ?? [];
  const shows = activePlaylist?.shows ?? [];
  const favoriteChannels = channels.filter((c) => favorites.includes(c.id));

  const groups = useMemo(
    () => getGroups(currentSection, channels, movies, shows, favorites, favoriteChannels),
    [currentSection, channels, movies, shows, favorites]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSelect = (group: string) => {
    setSelectedGroup(group);
    setSelectedChannel(null);
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
                    color: active ? colors.primary : colors.foreground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
                numberOfLines={2}
              >
                {group}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No groups
            </Text>
          </View>
        }
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    marginHorizontal: 4,
    marginBottom: 1,
  },
  groupText: {
    fontSize: 13,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
  },
});
