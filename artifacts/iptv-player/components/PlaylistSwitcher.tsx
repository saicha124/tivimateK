import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Playlist, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  M3U: "link",
  XtreamCodes: "log-in",
  StalkerPortal: "server",
};

function PlaylistStats({ playlist }: { playlist: Playlist }) {
  const colors = useColors();
  const parts = [];
  if (playlist.channels.length > 0) parts.push(`${playlist.channels.length.toLocaleString()} ch`);
  if (playlist.movies.length > 0) parts.push(`${playlist.movies.length.toLocaleString()} mov`);
  if (playlist.shows.length > 0) parts.push(`${playlist.shows.length.toLocaleString()} shows`);
  return (
    <Text style={[styles.stats, { color: colors.mutedForeground }]}>
      {parts.length > 0 ? parts.join(" · ") : "Empty playlist"}
    </Text>
  );
}

function LastUpdated({ ts }: { ts: number }) {
  const colors = useColors();
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${mins}m ago`;
  return (
    <Text style={[styles.updated, { color: colors.mutedForeground }]}>Updated {label}</Text>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddPlaylist: () => void;
}

export function PlaylistSwitcher({ visible, onClose, onAddPlaylist }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playlists, activePlaylist, setActivePlaylist } = useIPTV();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = (playlist: Playlist) => {
    if (playlist.id === activePlaylist?.id) {
      onClose();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePlaylist(playlist);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 12 }]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>Switch Playlist</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
            </Text>
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No playlists yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Add your first IPTV playlist to get started
                </Text>
              </View>
            ) : (
              playlists.map((playlist, index) => {
                const isActive = activePlaylist?.id === playlist.id;
                return (
                  <TouchableOpacity
                    key={playlist.id}
                    onPress={() => handleSelect(playlist)}
                    activeOpacity={0.75}
                    style={[
                      styles.playlistItem,
                      {
                        backgroundColor: isActive ? colors.highlight : colors.secondary,
                        borderColor: isActive ? colors.primary : colors.border,
                        marginTop: index === 0 ? 0 : 8,
                      },
                    ]}
                  >
                    {/* Left icon */}
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: isActive ? `${colors.primary}30` : colors.card },
                      ]}
                    >
                      <Feather
                        name={TYPE_ICONS[playlist.type] ?? "list"}
                        size={20}
                        color={isActive ? colors.primary : colors.mutedForeground}
                      />
                    </View>

                    {/* Info */}
                    <View style={styles.playlistInfo}>
                      <Text
                        style={[
                          styles.playlistName,
                          { color: isActive ? colors.primary : colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {playlist.name}
                      </Text>
                      <PlaylistStats playlist={playlist} />
                      <LastUpdated ts={playlist.lastUpdated} />
                    </View>

                    {/* Right side */}
                    <View style={styles.rightSide}>
                      {isActive ? (
                        <View
                          style={[
                            styles.activeIndicator,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Feather name="check" size={12} color="#fff" />
                        </View>
                      ) : (
                        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Add playlist button */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              onAddPlaylist();
            }}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add New Playlist</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  count: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  list: {
    maxHeight: 380,
    marginBottom: 16,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    gap: 3,
  },
  playlistName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  stats: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  updated: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  rightSide: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
