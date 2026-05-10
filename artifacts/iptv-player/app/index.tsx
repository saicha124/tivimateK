import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddPlaylistWizard } from "@/components/AddPlaylistWizard";
import { ChannelList } from "@/components/ChannelList";
import { GroupList } from "@/components/GroupList";
import { ProgramInfo } from "@/components/ProgramInfo";
import { SearchModal } from "@/components/SearchModal";
import { Sidebar } from "@/components/Sidebar";
import { Channel, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activePlaylist, selectedChannel } = useIPTV();

  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handlePlayChannel = (channel: Channel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/player", params: { url: channel.url, name: channel.name } });
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  if (!activePlaylist) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <LinearGradient
          colors={["#0d1b2a", "#111111"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.emptyContent}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="tv" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No playlist added
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            TiviMate doesn't provide any sources of TV channels.
            {"\n"}To watch TV channels, please add a playlist provided by your IPTV service.
          </Text>
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              onPress={() => setShowAddPlaylist(true)}
              style={[styles.primaryBtn, { backgroundColor: colors.foreground }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { color: colors.background }]}>
                Add playlist
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSettings}
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AddPlaylistWizard
          visible={showAddPlaylist}
          onClose={() => setShowAddPlaylist(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.mainLayout}>
        <Sidebar onSearch={() => setShowSearch(true)} onSettings={handleSettings} />
        <GroupList />
        <View style={styles.contentArea}>
          {selectedChannel && <ProgramInfo onPlay={handlePlayChannel} />}
          <ChannelList onPlayChannel={handlePlayChannel} />
        </View>
      </View>

      {/* FAB to add playlist */}
      <TouchableOpacity
        onPress={() => setShowAddPlaylist(true)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16,
          },
        ]}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <AddPlaylistWizard
        visible={showAddPlaylist}
        onClose={() => setShowAddPlaylist(false)}
      />
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onPlayChannel={handlePlayChannel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  contentArea: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
