import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddPlaylistWizard } from "@/components/AddPlaylistWizard";
import { Playlist, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { playlists, activePlaylist, setActivePlaylist, removePlaylist } = useIPTV();
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRemove = (playlist: Playlist) => {
    Alert.alert(
      "Remove Playlist",
      `Are you sure you want to remove "${playlist.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removePlaylist(playlist.id);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
        {/* Playlists section */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            PLAYLISTS
          </Text>
          {playlists.length === 0 ? (
            <View style={styles.emptyPlaylists}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No playlists added
              </Text>
            </View>
          ) : (
            playlists.map((playlist) => {
              const isActive = activePlaylist?.id === playlist.id;
              return (
                <View
                  key={playlist.id}
                  style={[
                    styles.playlistItem,
                    {
                      backgroundColor: isActive ? colors.highlight : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.playlistMain}
                    onPress={() => setActivePlaylist(playlist)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.playlistIcon, { backgroundColor: colors.secondary }]}>
                      <Feather
                        name={
                          playlist.type === "M3U"
                            ? "link"
                            : playlist.type === "XtreamCodes"
                            ? "log-in"
                            : "server"
                        }
                        size={18}
                        color={isActive ? colors.primary : colors.mutedForeground}
                      />
                    </View>
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
                      <Text style={[styles.playlistMeta, { color: colors.mutedForeground }]}>
                        {playlist.type} · {playlist.channels.length} channels · {playlist.movies.length} movies
                      </Text>
                    </View>
                    {isActive && <Feather name="check-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(playlist)}
                    style={[styles.removeBtn, { borderLeftColor: colors.border }]}
                  >
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          onPress={() => setShowAddPlaylist(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Playlist</Text>
        </TouchableOpacity>

        {/* App info */}
        <View style={[styles.section, { borderBottomColor: colors.border, marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            ABOUT
          </Text>
          <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>1.0.0</Text>
          </View>
          <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Supported Formats</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>M3U, Xtream Codes, Stalker Portal</Text>
          </View>
        </View>
      </ScrollView>

      <AddPlaylistWizard
        visible={showAddPlaylist}
        onClose={() => setShowAddPlaylist(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  emptyPlaylists: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  playlistMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  playlistMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  removeBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    alignSelf: "stretch",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
});
