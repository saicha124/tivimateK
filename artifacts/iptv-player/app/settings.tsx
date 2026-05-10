import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { GroupLockModal } from "@/components/GroupLockModal";
import { PinPad } from "@/components/PinPad";
import { Playlist, useIPTV } from "@/context/IPTVContext";
import { useParental } from "@/context/ParentalContext";
import { useColors } from "@/hooks/useColors";

type PinFlow =
  | "setup-new"
  | "setup-confirm"
  | "disable"
  | "change-old"
  | "change-new"
  | "lock-groups"
  | null;

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { playlists, activePlaylist, setActivePlaylist, removePlaylist } = useIPTV();
  const {
    isEnabled,
    hasPin,
    lockedGroups,
    enableControls,
    disableControls,
    changePin,
    verifyPin,
    lockAllSession,
  } = useParental();

  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [showGroupLock, setShowGroupLock] = useState(false);
  const [pinFlow, setPinFlow] = useState<PinFlow>(null);
  const [newPinBuffer, setNewPinBuffer] = useState("");

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

  // PIN flow title/subtitle helpers
  const pinTitle = () => {
    if (pinFlow === "setup-new") return "Set Parental PIN";
    if (pinFlow === "setup-confirm") return "Confirm PIN";
    if (pinFlow === "disable") return "Enter PIN to Disable";
    if (pinFlow === "change-old") return "Enter Current PIN";
    if (pinFlow === "change-new") return "Enter New PIN";
    if (pinFlow === "lock-groups") return "Enter PIN";
    return "";
  };

  const pinSubtitle = () => {
    if (pinFlow === "setup-new") return "Choose a 4-digit PIN to protect\nlocked channel groups";
    if (pinFlow === "setup-confirm") return "Enter the same PIN again to confirm";
    if (pinFlow === "disable") return "Enter your current PIN to disable\nparental controls";
    if (pinFlow === "change-old") return "Enter your current PIN first";
    if (pinFlow === "change-new") return "Now enter your new PIN";
    if (pinFlow === "lock-groups") return "Verify your PIN to manage\nlocked groups";
    return "";
  };

  const handlePinVerify = async (pin: string): Promise<boolean> => {
    if (pinFlow === "setup-new") {
      setNewPinBuffer(pin);
      setPinFlow("setup-confirm");
      return true; // accepted, moving to confirm step
    }
    if (pinFlow === "setup-confirm") {
      if (pin === newPinBuffer) {
        return true;
      }
      setNewPinBuffer("");
      setPinFlow("setup-new");
      return false;
    }
    if (pinFlow === "disable") {
      return disableControls(pin);
    }
    if (pinFlow === "change-old") {
      const ok = await verifyPin(pin);
      if (ok) {
        setNewPinBuffer(pin);
        setPinFlow("change-new");
        return true;
      }
      return false;
    }
    if (pinFlow === "change-new") {
      await changePin(newPinBuffer, pin);
      return true;
    }
    if (pinFlow === "lock-groups") {
      return verifyPin(pin);
    }
    return false;
  };

  const handlePinSuccess = async () => {
    if (pinFlow === "setup-confirm") {
      await enableControls(newPinBuffer);
      setNewPinBuffer("");
      setPinFlow(null);
      Alert.alert("Parental Controls Enabled", "Your PIN has been set. Locked groups will require this PIN.");
    } else if (pinFlow === "disable") {
      setPinFlow(null);
    } else if (pinFlow === "change-old") {
      // stay in flow (moved to change-new)
    } else if (pinFlow === "change-new") {
      setNewPinBuffer("");
      setPinFlow(null);
      Alert.alert("PIN Changed", "Your parental control PIN has been updated.");
    } else if (pinFlow === "lock-groups") {
      setPinFlow(null);
      setShowGroupLock(true);
    } else {
      setPinFlow(null);
    }
  };

  const openGroupLockManager = () => {
    if (hasPin) {
      setPinFlow("lock-groups");
    } else {
      setShowGroupLock(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16 }}>
        {/* Playlists */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PLAYLISTS</Text>
          {playlists.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No playlists added</Text>
            </View>
          ) : (
            playlists.map((playlist) => {
              const isActive = activePlaylist?.id === playlist.id;
              return (
                <View
                  key={playlist.id}
                  style={[styles.playlistItem, { backgroundColor: isActive ? colors.highlight : colors.card, borderColor: colors.border }]}
                >
                  <TouchableOpacity style={styles.playlistMain} onPress={() => setActivePlaylist(playlist)} activeOpacity={0.7}>
                    <View style={[styles.playlistIcon, { backgroundColor: colors.secondary }]}>
                      <Feather
                        name={playlist.type === "M3U" ? "link" : playlist.type === "XtreamCodes" ? "log-in" : "server"}
                        size={18}
                        color={isActive ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={[styles.playlistName, { color: isActive ? colors.primary : colors.foreground }]} numberOfLines={1}>
                        {playlist.name}
                      </Text>
                      <Text style={[styles.playlistMeta, { color: colors.mutedForeground }]}>
                        {playlist.type} · {playlist.channels.length} channels · {playlist.movies.length} movies
                      </Text>
                    </View>
                    {isActive && <Feather name="check-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemove(playlist)} style={[styles.removeBtn, { borderLeftColor: colors.border }]}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <TouchableOpacity
            onPress={() => setShowAddPlaylist(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Playlist</Text>
          </TouchableOpacity>
        </View>

        {/* Parental Controls */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PARENTAL CONTROLS</Text>

          {/* Enable/Disable toggle row */}
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingIconBg, { backgroundColor: isEnabled ? `${colors.destructive}25` : colors.secondary }]}>
              <Feather name={isEnabled ? "shield" : "shield-off"} size={18} color={isEnabled ? colors.destructive : colors.mutedForeground} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                {isEnabled ? "Controls Enabled" : "Controls Disabled"}
              </Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                {isEnabled
                  ? `${lockedGroups.length} group${lockedGroups.length !== 1 ? "s" : ""} locked with PIN`
                  : "Set a PIN to restrict access to content"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                if (isEnabled) {
                  setPinFlow("disable");
                } else {
                  setPinFlow("setup-new");
                }
              }}
              style={[
                styles.toggleButton,
                { backgroundColor: isEnabled ? colors.destructive : colors.primary },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleButtonText}>{isEnabled ? "Disable" : "Enable"}</Text>
            </TouchableOpacity>
          </View>

          {/* Manage locked groups */}
          {isEnabled && (
            <>
              <TouchableOpacity
                onPress={openGroupLockManager}
                style={[styles.settingRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconBg, { backgroundColor: colors.secondary }]}>
                  <Feather name="lock" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Manage Locked Groups</Text>
                  <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                    Choose which channel groups are PIN-protected
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setPinFlow("change-old"); }}
                style={[styles.settingRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconBg, { backgroundColor: colors.secondary }]}>
                  <Feather name="key" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Change PIN</Text>
                  <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                    Update your parental control PIN
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  lockAllSession();
                  Alert.alert("Session Locked", "All temporarily unlocked groups have been re-locked.");
                }}
                style={[styles.settingRow, { borderBottomColor: "transparent", backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconBg, { backgroundColor: `${colors.destructive}20` }]}>
                  <Feather name="lock" size={18} color={colors.destructive} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.destructive }]}>Lock All Now</Text>
                  <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                    Re-lock any temporarily unlocked groups
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* About */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
          {[
            { label: "App Version", value: "1.0.0" },
            { label: "Supported Formats", value: "M3U, Xtream Codes, Stalker Portal" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[styles.infoItem, { borderBottomColor: i < arr.length - 1 ? colors.border : "transparent", backgroundColor: colors.card }]}
            >
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <AddPlaylistWizard visible={showAddPlaylist} onClose={() => setShowAddPlaylist(false)} />

      <GroupLockModal visible={showGroupLock} onClose={() => setShowGroupLock(false)} />

      <PinPad
        visible={!!pinFlow}
        title={pinTitle()}
        subtitle={pinSubtitle()}
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinFlow(null); setNewPinBuffer(""); }}
        onVerify={handlePinVerify}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  section: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  emptyRow: { paddingVertical: 16, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
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
  playlistInfo: { flex: 1 },
  playlistName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playlistMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
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
    marginTop: 8,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  settingIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  settingDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 15 },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleButtonText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginBottom: 4,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right", marginLeft: 8 },
});
