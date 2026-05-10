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
  Switch,
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

type SettingsPage =
  | "main"
  | "playlists"
  | "playback"
  | "parental"
  | "other"
  | "reminders"
  | "recording"
  | "vod"
  | "about";

type PinFlow =
  | "setup-new"
  | "setup-confirm"
  | "disable"
  | "change-old"
  | "change-new"
  | "lock-groups"
  | null;

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightEl,
  last,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightEl?: React.ReactNode;
  last?: boolean;
  destructive?: boolean;
}) {
  const colors = useColors();
  const content = (
    <View
      style={[
        rowStyles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: destructive ? `${colors.destructive}20` : colors.secondary }]}>
        <Feather name={icon as any} size={17} color={destructive ? colors.destructive : colors.mutedForeground} />
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.label, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
        {value !== undefined && (
          <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>{value}</Text>
        )}
      </View>
      {rightEl !== undefined ? rightEl : onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  value: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { playlists, activePlaylist, setActivePlaylist, removePlaylist, reminderSettings, updateReminderSettings, recordingSettings, updateRecordingSettings } = useIPTV();
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

  const [page, setPage] = useState<SettingsPage>("main");
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
    if (pinFlow === "setup-new") { setNewPinBuffer(pin); setPinFlow("setup-confirm"); return true; }
    if (pinFlow === "setup-confirm") {
      if (pin === newPinBuffer) return true;
      setNewPinBuffer(""); setPinFlow("setup-new"); return false;
    }
    if (pinFlow === "disable") return disableControls(pin);
    if (pinFlow === "change-old") {
      const ok = await verifyPin(pin);
      if (ok) { setNewPinBuffer(pin); setPinFlow("change-new"); return true; }
      return false;
    }
    if (pinFlow === "change-new") { await changePin(newPinBuffer, pin); return true; }
    if (pinFlow === "lock-groups") return verifyPin(pin);
    return false;
  };

  const handlePinSuccess = async () => {
    if (pinFlow === "setup-confirm") {
      await enableControls(newPinBuffer);
      setNewPinBuffer(""); setPinFlow(null);
      Alert.alert("Parental Controls Enabled", "Your PIN has been set.");
    } else if (pinFlow === "disable") {
      setPinFlow(null);
    } else if (pinFlow === "change-old") {
      // stay in flow
    } else if (pinFlow === "change-new") {
      setNewPinBuffer(""); setPinFlow(null);
      Alert.alert("PIN Changed", "Your parental control PIN has been updated.");
    } else if (pinFlow === "lock-groups") {
      setPinFlow(null); setShowGroupLock(true);
    } else {
      setPinFlow(null);
    }
  };

  const openGroupLockManager = () => {
    if (hasPin) setPinFlow("lock-groups");
    else setShowGroupLock(true);
  };

  const goBack = () => {
    Haptics.selectionAsync();
    if (page === "reminders" || page === "recording" || page === "vod") setPage("other");
    else if (page !== "main") setPage("main");
    else router.back();
  };

  const pageTitle = () => {
    if (page === "main") return "Settings";
    if (page === "playlists") return "Playlists";
    if (page === "playback") return "Playback";
    if (page === "parental") return "Parental controls";
    if (page === "other") return "Other";
    if (page === "reminders") return "Reminders";
    if (page === "recording") return "Recording";
    if (page === "vod") return "VOD";
    if (page === "about") return "About";
    return "Settings";
  };

  const renderMain = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="list" label="Playlists" value={`${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}`} onPress={() => { Haptics.selectionAsync(); setPage("playlists"); }} />
        <SettingRow icon="play-circle" label="Playback" onPress={() => { Haptics.selectionAsync(); setPage("playback"); }} />
        <SettingRow icon="shield" label="Parental controls" value={isEnabled ? `${lockedGroups.length} group${lockedGroups.length !== 1 ? "s" : ""} locked` : "Off"} onPress={() => { Haptics.selectionAsync(); setPage("parental"); }} />
        <SettingRow icon="more-horizontal" label="Other" onPress={() => { Haptics.selectionAsync(); setPage("other"); }} />
        <SettingRow icon="info" label="About" onPress={() => { Haptics.selectionAsync(); setPage("about"); }} last />
      </View>
    </ScrollView>
  );

  const renderPlaylists = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      {playlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="list" size={40} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No playlists added</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {playlists.map((playlist) => {
            const isActive = activePlaylist?.id === playlist.id;
            return (
              <View
                key={playlist.id}
                style={[styles.playlistItem, { backgroundColor: isActive ? `${colors.primary}18` : colors.card, borderColor: isActive ? colors.primary : colors.border }]}
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
          })}
        </View>
      )}
      <TouchableOpacity
        onPress={() => setShowAddPlaylist(true)}
        style={[styles.addBtn, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 12 }]}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.addBtnText}>Add Playlist</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPlayback = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VIDEO</Text>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="monitor" label="Video decoder" value="Auto" onPress={() => {}} />
        <SettingRow icon="zap" label="Hardware acceleration" value="Auto" onPress={() => {}} />
        <SettingRow icon="maximize" label="Aspect ratio" value="Auto fit" onPress={() => {}} last />
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AUDIO</Text>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="volume-2" label="Audio track" value="Default" onPress={() => {}} />
        <SettingRow icon="headphones" label="Audio boost" value="Off" onPress={() => {}} last />
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUBTITLES</Text>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="type" label="Subtitle track" value="None" onPress={() => {}} />
        <SettingRow icon="font" label="Subtitle size" value="Medium" onPress={() => {}} last />
      </View>
    </ScrollView>
  );

  const renderParental = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={rowStyles.row}>
          <View style={[rowStyles.iconWrap, { backgroundColor: isEnabled ? `${colors.destructive}20` : colors.secondary }]}>
            <Feather name={isEnabled ? "shield" : "shield-off"} size={17} color={isEnabled ? colors.destructive : colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>
              {isEnabled ? "Controls enabled" : "Controls disabled"}
            </Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>
              {isEnabled ? `${lockedGroups.length} group${lockedGroups.length !== 1 ? "s" : ""} locked with PIN` : "Set a PIN to restrict access"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); isEnabled ? setPinFlow("disable") : setPinFlow("setup-new"); }}
            style={[styles.toggleBtn, { backgroundColor: isEnabled ? colors.destructive : colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleBtnText}>{isEnabled ? "Disable" : "Enable"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEnabled && (
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
          <SettingRow icon="lock" label="Manage locked groups" value={`${lockedGroups.length} group${lockedGroups.length !== 1 ? "s" : ""} locked`} onPress={openGroupLockManager} />
          <SettingRow icon="key" label="Change PIN" onPress={() => { Haptics.selectionAsync(); setPinFlow("change-old"); }} />
          <SettingRow icon="lock" label="Lock all now" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); lockAllSession(); Alert.alert("Session Locked", "All temporarily unlocked groups have been re-locked."); }} destructive last />
        </View>
      )}
    </ScrollView>
  );

  const renderOther = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="bell" label="Reminders" onPress={() => { Haptics.selectionAsync(); setPage("reminders"); }} />
        <SettingRow icon="video" label="Recording" onPress={() => { Haptics.selectionAsync(); setPage("recording"); }} />
        <SettingRow icon="film" label="VOD" onPress={() => { Haptics.selectionAsync(); setPage("vod"); }} last />
      </View>
    </ScrollView>
  );

  const renderReminders = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {/* Remind before program start */}
        <View style={[rowStyles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Remind before program start, min</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>{reminderSettings.remindBeforeMinutes}</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateReminderSettings({ remindBeforeMinutes: Math.max(1, reminderSettings.remindBeforeMinutes - 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={13} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: colors.foreground }]}>{reminderSettings.remindBeforeMinutes}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateReminderSettings({ remindBeforeMinutes: Math.min(60, reminderSettings.remindBeforeMinutes + 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={13} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Popup timeout */}
        <View style={[rowStyles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="alert-circle" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Popup timeout, sec</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>{reminderSettings.popupTimeoutSecs}</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateReminderSettings({ popupTimeoutSecs: Math.max(5, reminderSettings.popupTimeoutSecs - 5) }); }}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={13} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: colors.foreground }]}>{reminderSettings.popupTimeoutSecs}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateReminderSettings({ popupTimeoutSecs: Math.min(60, reminderSettings.popupTimeoutSecs + 5) }); }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={13} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Default action */}
        <View style={[rowStyles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="play" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Default action</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>
              {reminderSettings.defaultAction === "watch" ? "Watch" : "Dismiss"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["watch", "dismiss"] as const).map((action) => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionChip,
                  {
                    backgroundColor: reminderSettings.defaultAction === action ? colors.primary : colors.secondary,
                    borderColor: reminderSettings.defaultAction === action ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); updateReminderSettings({ defaultAction: action }); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionChipText, { color: reminderSettings.defaultAction === action ? "#fff" : colors.mutedForeground }]}>
                  {action === "watch" ? "Watch" : "Dismiss"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Wake from sleep */}
        <View style={rowStyles.row}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="moon" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Wake up from sleep mode</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>May not work on all devices</Text>
          </View>
          <Switch
            value={reminderSettings.wakeFromSleep}
            onValueChange={(v) => { Haptics.selectionAsync(); updateReminderSettings({ wakeFromSleep: v }); }}
            trackColor={{ false: colors.border, true: `${colors.primary}80` }}
            thumbColor={reminderSettings.wakeFromSleep ? colors.primary : colors.mutedForeground}
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderRecording = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow
          icon="folder"
          label="Recordings folder"
          value={recordingSettings.recordingsFolder}
          onPress={() => {}}
          last
        />
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
        {/* Start before */}
        <View style={[rowStyles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="skip-back" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Start recording before program start, min</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>{recordingSettings.startBeforeMinutes}</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateRecordingSettings({ startBeforeMinutes: Math.max(0, recordingSettings.startBeforeMinutes - 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={13} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: colors.foreground }]}>{recordingSettings.startBeforeMinutes}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateRecordingSettings({ startBeforeMinutes: Math.min(60, recordingSettings.startBeforeMinutes + 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={13} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stop after */}
        <View style={rowStyles.row}>
          <View style={[rowStyles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="skip-forward" size={17} color={colors.mutedForeground} />
          </View>
          <View style={rowStyles.info}>
            <Text style={[rowStyles.label, { color: colors.foreground }]}>Stop recording after program end, min</Text>
            <Text style={[rowStyles.value, { color: colors.mutedForeground }]}>{recordingSettings.stopAfterMinutes}</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateRecordingSettings({ stopAfterMinutes: Math.max(0, recordingSettings.stopAfterMinutes - 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={13} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: colors.foreground }]}>{recordingSettings.stopAfterMinutes}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); updateRecordingSettings({ stopAfterMinutes: Math.min(60, recordingSettings.stopAfterMinutes + 1) }); }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={13} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderVOD = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="film" label="Default quality" value="Auto" onPress={() => {}} />
        <SettingRow icon="download" label="Download location" value="Default" onPress={() => {}} />
        <SettingRow icon="wifi" label="Stream over Wi-Fi only" rightEl={<Switch value={false} onValueChange={() => {}} trackColor={{ false: "#555", true: "#4e9af1" }} />} last />
      </View>
    </ScrollView>
  );

  const renderAbout = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingTop: 8 }}>
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <SettingRow icon="package" label="App version" value="1.0.0" last={false} />
        <SettingRow icon="code" label="Supported formats" value="M3U, Xtream Codes, Stalker Portal" last={false} />
        <SettingRow icon="globe" label="Website" value="tivimate.com" last />
      </View>
    </ScrollView>
  );

  const renderPage = () => {
    if (page === "main") return renderMain();
    if (page === "playlists") return renderPlaylists();
    if (page === "playback") return renderPlayback();
    if (page === "parental") return renderParental();
    if (page === "other") return renderOther();
    if (page === "reminders") return renderReminders();
    if (page === "recording") return renderRecording();
    if (page === "vod") return renderVOD();
    if (page === "about") return renderAbout();
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{pageTitle()}</Text>
        <View style={{ width: 36 }} />
      </View>

      {renderPage()}

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
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 16,
    textTransform: "uppercase",
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 8,
  },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
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
  },
  addBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  toggleBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    minWidth: 28,
    textAlign: "center",
  },
  actionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
