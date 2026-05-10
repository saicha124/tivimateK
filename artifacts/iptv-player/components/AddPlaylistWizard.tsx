import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PlaylistType, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

type Step = "type" | "m3u" | "xtream" | "stalker" | "loading";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddPlaylistWizard({ visible, onClose }: Props) {
  const colors = useColors();
  const { addPlaylist, isLoading, loadingMessage } = useIPTV();

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<PlaylistType>("M3U");

  const [m3uUrl, setM3uUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");

  const [xtreamServer, setXtreamServer] = useState("");
  const [xtreamUsername, setXtreamUsername] = useState("");
  const [xtreamPassword, setXtreamPassword] = useState("");

  const [stalkerServer, setStalkerServer] = useState("");
  const [stalkerMac, setStalkerMac] = useState("00:1a:79:cf:7b:e8");
  const [stalkerUsername, setStalkerUsername] = useState("");
  const [stalkerPassword, setStalkerPassword] = useState("");

  const reset = () => {
    setStep("type");
    setM3uUrl("");
    setPlaylistName("");
    setXtreamServer("");
    setXtreamUsername("");
    setXtreamPassword("");
    setStalkerServer("");
    setStalkerMac("00:1a:79:cf:7b:e8");
    setStalkerUsername("");
    setStalkerPassword("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleTypeSelect = (type: PlaylistType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
    if (type === "M3U") setStep("m3u");
    else if (type === "XtreamCodes") setStep("xtream");
    else setStep("stalker");
  };

  const handleAdd = async () => {
    try {
      if (selectedType === "M3U") {
        if (!m3uUrl.trim()) {
          Alert.alert("Error", "Please enter a valid M3U URL");
          return;
        }
        await addPlaylist({
          type: "M3U",
          name: playlistName || "My Playlist",
          url: m3uUrl.trim(),
        });
      } else if (selectedType === "XtreamCodes") {
        if (!xtreamServer.trim() || !xtreamUsername.trim() || !xtreamPassword.trim()) {
          Alert.alert("Error", "Please fill in all Xtream Codes fields");
          return;
        }
        await addPlaylist({
          type: "XtreamCodes",
          name: playlistName || xtreamServer,
          serverAddress: xtreamServer.trim(),
          username: xtreamUsername.trim(),
          password: xtreamPassword.trim(),
        });
      } else {
        if (!stalkerServer.trim()) {
          Alert.alert("Error", "Please enter the server address");
          return;
        }
        await addPlaylist({
          type: "StalkerPortal",
          name: playlistName || stalkerServer,
          serverAddress: stalkerServer.trim(),
          macAddress: stalkerMac.trim(),
          username: stalkerUsername.trim(),
          password: stalkerPassword.trim(),
        });
      }
      handleClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to load playlist");
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }];
  const labelStyle = [styles.label, { color: colors.mutedForeground }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={step === "type" ? handleClose : () => setStep("type")} style={styles.backBtn}>
              <Feather name={step === "type" ? "x" : "arrow-left"} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {step === "type" ? "Add Playlist" : step === "m3u" ? "M3U Playlist" : step === "xtream" ? "Xtream Codes" : "Stalker Portal"}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.foreground }]}>
                {loadingMessage || "Loading..."}
              </Text>
              <Text style={[styles.loadingSubtext, { color: colors.mutedForeground }]}>
                Please wait while we fetch your channels
              </Text>
            </View>
          ) : step === "type" ? (
            <View style={styles.typeList}>
              {(["M3U", "XtreamCodes", "StalkerPortal"] as PlaylistType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleTypeSelect(type)}
                  style={[styles.typeItem, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.typeLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: colors.secondary }]}>
                      <Feather
                        name={type === "M3U" ? "link" : type === "XtreamCodes" ? "log-in" : "server"}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.typeName, { color: colors.foreground }]}>
                        {type === "M3U" ? "M3U Playlist" : type === "XtreamCodes" ? "Xtream Codes" : "Stalker Portal"}
                      </Text>
                      <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                        {type === "M3U"
                          ? "Add via M3U URL or file"
                          : type === "XtreamCodes"
                          ? "Server + username + password"
                          : "Portal URL + MAC address"}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={labelStyle}>Playlist name (optional)</Text>
              <TextInput
                style={inputStyle}
                placeholder="My Playlist"
                placeholderTextColor={colors.mutedForeground}
                value={playlistName}
                onChangeText={setPlaylistName}
              />

              {step === "m3u" && (
                <>
                  <Text style={labelStyle}>M3U URL *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="http://example.com/playlist.m3u"
                    placeholderTextColor={colors.mutedForeground}
                    value={m3uUrl}
                    onChangeText={setM3uUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </>
              )}

              {step === "xtream" && (
                <>
                  <Text style={labelStyle}>Server address *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="http://server.com:8080"
                    placeholderTextColor={colors.mutedForeground}
                    value={xtreamServer}
                    onChangeText={setXtreamServer}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Text style={labelStyle}>Username *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="username"
                    placeholderTextColor={colors.mutedForeground}
                    value={xtreamUsername}
                    onChangeText={setXtreamUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={labelStyle}>Password *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="password"
                    placeholderTextColor={colors.mutedForeground}
                    value={xtreamPassword}
                    onChangeText={setXtreamPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              {step === "stalker" && (
                <>
                  <Text style={labelStyle}>Server address *</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="http://portal.example.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={stalkerServer}
                    onChangeText={setStalkerServer}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Text style={labelStyle}>MAC address</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="00:1a:79:cf:7b:e8"
                    placeholderTextColor={colors.mutedForeground}
                    value={stalkerMac}
                    onChangeText={setStalkerMac}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={labelStyle}>Username (optional)</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="username"
                    placeholderTextColor={colors.mutedForeground}
                    value={stalkerUsername}
                    onChangeText={setStalkerUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={labelStyle}>Password (optional)</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="password"
                    placeholderTextColor={colors.mutedForeground}
                    value={stalkerPassword}
                    onChangeText={setStalkerPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              <TouchableOpacity
                onPress={handleAdd}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.addButtonText, { color: "#fff" }]}>Add Playlist</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  typeList: {
    paddingVertical: 8,
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  typeName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  typeDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  addButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
