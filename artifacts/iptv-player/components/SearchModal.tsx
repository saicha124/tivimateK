import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Channel, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPlayChannel: (channel: Channel) => void;
}

export function SearchModal({ visible, onClose, onPlayChannel }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activePlaylist, setSelectedChannel, setCurrentSection, setSelectedGroup } = useIPTV();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim() || !activePlaylist) return [];
    const q = query.toLowerCase();
    return activePlaylist.channels
      .filter((c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
      .slice(0, 50);
  }, [query, activePlaylist]);

  const handleSelect = (channel: Channel) => {
    setCurrentSection("TV");
    setSelectedGroup(channel.group);
    setSelectedChannel(channel);
    setQuery("");
    onClose();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: topPad + 8 }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search channels..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            scrollEnabled={results.length > 0}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: channel }) => (
              <TouchableOpacity
                onPress={() => handleSelect(channel)}
                style={[styles.result, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
                  {channel.logo ? (
                    <Image source={{ uri: channel.logo }} style={styles.logoImg} contentFit="contain" />
                  ) : (
                    <Feather name="tv" size={16} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {channel.name}
                  </Text>
                  <Text style={[styles.group, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {channel.group}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    onPlayChannel(channel);
                    onClose();
                  }}
                  style={[styles.playBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="play" size={12} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length > 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results for "{query}"</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Start typing to search channels</Text>
                </View>
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 12,
  },
  container: {
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 500,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 40,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 40,
    height: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  group: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
