import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ResizeMode, Video } from "expo-av";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface StreamSlot {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  paused: boolean;
}

interface MultiviewScreenProps {
  visible: boolean;
  initialChannelId?: string;
  initialChannelName?: string;
  initialChannelUrl?: string;
  onClose: () => void;
}

const MAX_STREAMS = 6;

function getGridCols(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

export function MultiviewScreen({
  visible,
  initialChannelId,
  initialChannelName,
  initialChannelUrl,
  onClose,
}: MultiviewScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activePlaylist } = useIPTV();

  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [streams, setStreams] = useState<StreamSlot[]>(() => {
    if (initialChannelUrl && initialChannelName && initialChannelId) {
      return [{ id: "s0", channelId: initialChannelId, channelName: initialChannelName, channelUrl: initialChannelUrl, paused: false }];
    }
    return [];
  });

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSlotMenu, setShowSlotMenu] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [channelPickerForSlot, setChannelPickerForSlot] = useState<number | null>(null);
  const [enlargedSlot, setEnlargedSlot] = useState<number | null>(null);
  const [fullscreenSlot, setFullscreenSlot] = useState<number | null>(null);

  const { width: screenW, height: screenH } = Dimensions.get("window");
  const contentH = screenH - topPad - bottomPad - 56;

  const allChannels = activePlaylist?.channels ?? [];
  const activeCount = streams.length;
  const showEmptySlot = activeCount < MAX_STREAMS;

  const slots: (StreamSlot | null)[] = [
    ...streams,
    ...(showEmptySlot ? [null as null] : []),
  ];

  const cols = getGridCols(slots.length);
  const rows = Math.ceil(slots.length / cols);
  const paneW = screenW / cols;
  const paneH = contentH / rows;

  const addStream = (slotIndex: number, channelId: string, channelName: string, channelUrl: string) => {
    setStreams((prev) => {
      const next = [...prev];
      if (slotIndex < next.length) {
        next[slotIndex] = { id: `s${Date.now()}`, channelId, channelName, channelUrl, paused: false };
      } else {
        next.push({ id: `s${Date.now()}`, channelId, channelName, channelUrl, paused: false });
      }
      return next;
    });
    setShowChannelPicker(false);
    setChannelPickerForSlot(null);
  };

  const replaceStream = (slotIndex: number, channelId: string, channelName: string, channelUrl: string) => {
    setStreams((prev) => {
      const next = [...prev];
      if (slotIndex < next.length) {
        next[slotIndex] = { ...next[slotIndex], channelId, channelName, channelUrl };
      }
      return next;
    });
    setShowChannelPicker(false);
    setChannelPickerForSlot(null);
  };

  const removeStream = (slotIndex: number) => {
    setStreams((prev) => prev.filter((_, i) => i !== slotIndex));
    setShowSlotMenu(false);
    setSelectedSlot(null);
    if (enlargedSlot === slotIndex) setEnlargedSlot(null);
    if (fullscreenSlot === slotIndex) setFullscreenSlot(null);
  };

  const togglePause = (slotIndex: number) => {
    setStreams((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, paused: !s.paused } : s))
    );
    setShowSlotMenu(false);
  };

  const openSlotMenu = (slotIndex: number) => {
    Haptics.selectionAsync();
    setSelectedSlot(slotIndex);
    setShowSlotMenu(true);
  };

  const openChannelPicker = (slotIndex: number) => {
    Haptics.selectionAsync();
    setChannelPickerForSlot(slotIndex);
    setShowChannelPicker(true);
  };

  const selectedStream = selectedSlot !== null && selectedSlot < streams.length ? streams[selectedSlot] : null;

  const renderPane = (slot: StreamSlot | null, index: number, w: number, h: number) => {
    const isSelected = selectedSlot === index && showSlotMenu;
    const isEnlarged = enlargedSlot === index;

    if (!slot) {
      return (
        <TouchableOpacity
          key={`empty-${index}`}
          style={[styles.pane, { width: w, height: h }]}
          onPress={() => openChannelPicker(index)}
          activeOpacity={0.8}
        >
          <View style={styles.emptyPane}>
            <View style={[styles.addCircle, { borderColor: "rgba(255,255,255,0.3)" }]}>
              <Feather name="plus" size={24} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.addScreenText}>Add screen</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={slot.id}
        style={[
          styles.pane,
          { width: w, height: h },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
          isEnlarged && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => openSlotMenu(index)}
        activeOpacity={0.9}
      >
        {slot.paused ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }]}>
            <Feather name="pause-circle" size={36} color="rgba(255,255,255,0.3)" />
          </View>
        ) : (
          <Video
            source={{ uri: slot.channelUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={!slot.paused}
            useNativeControls={false}
            isMuted={index > 0}
          />
        )}
        <View style={styles.paneFooter}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>LIVE</Text>
          </View>
          <Text style={styles.paneChannelName} numberOfLines={1}>{slot.channelName}</Text>
        </View>
        {slot.paused && (
          <View style={styles.pausedBadge}>
            <Feather name="pause" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGrid = () => {
    if (fullscreenSlot !== null && fullscreenSlot < streams.length) {
      const slot = streams[fullscreenSlot];
      return (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, styles.pane]}
          onPress={() => openSlotMenu(fullscreenSlot)}
          activeOpacity={0.9}
        >
          <Video
            source={{ uri: slot.channelUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls={false}
          />
          <View style={styles.paneFooter}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTxt}>LIVE</Text>
            </View>
            <Text style={styles.paneChannelName}>{slot.channelName}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (enlargedSlot !== null && enlargedSlot < streams.length) {
      const mainH = contentH * 0.68;
      const thumbH = contentH * 0.32;
      const thumbW = thumbH * (16 / 9);
      const others = slots.filter((_, i) => i !== enlargedSlot);
      return (
        <View style={{ flex: 1 }}>
          {renderPane(streams[enlargedSlot], enlargedSlot, screenW, mainH)}
          <View style={{ flexDirection: "row", height: thumbH }}>
            {others.map((s, i) => {
              const realIdx = i < enlargedSlot ? i : i + 1;
              return renderPane(s, realIdx, thumbW, thumbH);
            })}
          </View>
        </View>
      );
    }

    const gridRows: (StreamSlot | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      gridRows.push(slots.slice(r * cols, (r + 1) * cols));
    }

    return (
      <View style={{ flex: 1 }}>
        {gridRows.map((row, rIdx) => (
          <View key={rIdx} style={{ flexDirection: "row", height: paneH }}>
            {row.map((slot, cIdx) => renderPane(slot, rIdx * cols + cIdx, paneW, paneH))}
          </View>
        ))}
      </View>
    );
  };

  const isChangingChannel = channelPickerForSlot !== null && channelPickerForSlot < streams.length;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <View style={[styles.header, { paddingTop: topPad + 6 }]}>
          <TouchableOpacity onPress={onClose} style={styles.hBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Feather name="layout" size={15} color={colors.primary} />
            <Text style={styles.headerTitle}>Multiview</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{activeCount}</Text>
            </View>
          </View>
          {(enlargedSlot !== null || fullscreenSlot !== null) ? (
            <TouchableOpacity
              onPress={() => { setEnlargedSlot(null); setFullscreenSlot(null); }}
              style={styles.hBtn}
            >
              <Feather name="grid" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.hBtn} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          {activeCount === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="layout" size={52} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTitle}>Multiview</Text>
              <Text style={styles.emptyDesc}>Watch multiple channels simultaneously</Text>
              <TouchableOpacity
                style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
                onPress={() => openChannelPicker(0)}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addFirstBtnText}>Add first screen</Text>
              </TouchableOpacity>
            </View>
          ) : renderGrid()}
        </View>

        <View style={[styles.bottomBar, { paddingBottom: bottomPad + 4 }]}>
          <TouchableOpacity
            style={[styles.bbBtn, activeCount >= MAX_STREAMS && styles.bbBtnDisabled]}
            onPress={() => {
              if (activeCount < MAX_STREAMS) openChannelPicker(streams.length);
            }}
          >
            <Feather name="plus-circle" size={17} color={colors.primary} />
            <Text style={[styles.bbBtnText, { color: colors.primary }]}>Add screen</Text>
          </TouchableOpacity>
          <View style={styles.bbSep} />
          <TouchableOpacity
            style={styles.bbBtn}
            onPress={() => setStreams((prev) => prev.map((s) => ({ ...s, paused: !prev.every((x) => x.paused) })))}
          >
            <Feather name="pause" size={17} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.bbBtnText, { color: "rgba(255,255,255,0.7)" }]}>Pause all</Text>
          </TouchableOpacity>
          <View style={styles.bbSep} />
          <TouchableOpacity
            style={styles.bbBtn}
            onPress={() => { setEnlargedSlot(null); setFullscreenSlot(null); setStreams([]); onClose(); }}
          >
            <Feather name="x-circle" size={17} color="rgba(255,255,255,0.5)" />
            <Text style={[styles.bbBtnText, { color: "rgba(255,255,255,0.5)" }]}>Close all</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showSlotMenu} transparent animationType="fade" onRequestClose={() => setShowSlotMenu(false)}>
          <TouchableWithoutFeedback onPress={() => setShowSlotMenu(false)}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.menuSheet, { backgroundColor: "#1e1e1e" }]}>
                  <Text style={[styles.menuTitle, { color: colors.primary }]}>
                    {selectedStream?.channelName ?? "Screen"}
                  </Text>
                  {[
                    {
                      icon: "plus-circle" as const,
                      label: "Add screen",
                      action: () => {
                        setShowSlotMenu(false);
                        openChannelPicker(streams.length);
                      },
                    },
                    {
                      icon: "search" as const,
                      label: "Search and add",
                      action: () => {
                        setShowSlotMenu(false);
                        openChannelPicker(streams.length);
                      },
                    },
                    {
                      icon: "refresh-cw" as const,
                      label: "Change channel",
                      action: () => {
                        setShowSlotMenu(false);
                        if (selectedSlot !== null) openChannelPicker(selectedSlot);
                      },
                    },
                    {
                      icon: (selectedStream?.paused ? "play" : "pause") as keyof typeof Feather.glyphMap,
                      label: selectedStream?.paused ? "Resume" : "Pause",
                      action: () => {
                        if (selectedSlot !== null) togglePause(selectedSlot);
                      },
                    },
                    {
                      icon: "maximize-2" as const,
                      label: "Enlarge screen",
                      action: () => {
                        setEnlargedSlot(selectedSlot);
                        setFullscreenSlot(null);
                        setShowSlotMenu(false);
                      },
                    },
                    {
                      icon: "maximize" as const,
                      label: "Full screen",
                      action: () => {
                        setFullscreenSlot(selectedSlot);
                        setEnlargedSlot(null);
                        setShowSlotMenu(false);
                      },
                    },
                    {
                      icon: "x-circle" as const,
                      label: "Remove screen",
                      destructive: true,
                      action: () => {
                        if (selectedSlot !== null) removeStream(selectedSlot);
                      },
                    },
                  ].map((item, i, arr) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)" }]}
                      onPress={() => { Haptics.selectionAsync(); item.action(); }}
                    >
                      <Feather name={item.icon} size={18} color={(item as any).destructive ? "#f44336" : "#fff"} />
                      <Text style={[styles.menuLabel, { color: (item as any).destructive ? "#f44336" : "#fff" }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={showChannelPicker} animationType="slide" statusBarTranslucent onRequestClose={() => setShowChannelPicker(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.pickerHeader, { paddingTop: topPad + 8, backgroundColor: colors.sidebar, borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowChannelPicker(false)} style={styles.hBtn}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                {isChangingChannel ? "Change channel" : "Add screen"}
              </Text>
              <View style={styles.hBtn} />
            </View>
            <FlatList
              data={allChannels}
              keyExtractor={(item) => item.id}
              renderItem={({ item: ch }) => (
                <TouchableOpacity
                  style={styles.chRow}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (channelPickerForSlot !== null) {
                      if (isChangingChannel) {
                        replaceStream(channelPickerForSlot, ch.id, ch.name, ch.url);
                      } else {
                        addStream(channelPickerForSlot, ch.id, ch.name, ch.url);
                      }
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chLogo, { backgroundColor: colors.secondary }]}>
                    <Feather name="tv" size={14} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chName, { color: colors.foreground }]} numberOfLines={1}>{ch.name}</Text>
                    <Text style={[styles.chGroup, { color: colors.mutedForeground }]} numberOfLines={1}>{ch.group}</Text>
                  </View>
                  <Feather name="plus" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 64 }} />
              )}
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
    gap: 8,
    zIndex: 10,
  },
  hBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  pane: {
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    position: "relative",
  },
  paneFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    gap: 2,
  },
  livePill: { flexDirection: "row", alignItems: "center", gap: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#f44336" },
  liveTxt: { color: "#f44336", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  paneChannelName: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  pausedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPane: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  addCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  addScreenText: { color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 40 },
  emptyTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  emptyDesc: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  addFirstBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10, marginTop: 8 },
  addFirstBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  bbBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  bbBtnDisabled: { opacity: 0.4 },
  bbBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bbSep: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: "rgba(255,255,255,0.15)" },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  menuSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 14,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  menuTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1 },
  pickerContainer: { flex: 1 },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  pickerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  chRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  chLogo: { width: 38, height: 38, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  chName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  chGroup: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
