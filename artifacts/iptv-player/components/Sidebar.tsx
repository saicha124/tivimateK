import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Section, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

interface SidebarItem {
  section: Section | "Search" | "Settings";
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

const ITEMS: SidebarItem[] = [
  { section: "Search", icon: "search", label: "Search" },
  { section: "TV", icon: "tv", label: "TV" },
  { section: "Movies", icon: "film", label: "Movies" },
  { section: "Shows", icon: "grid", label: "Shows" },
  { section: "Recordings", icon: "video", label: "Recordings" },
  { section: "My List", icon: "bookmark", label: "My List" },
];

interface SidebarProps {
  onSearch: () => void;
  onSettings: () => void;
}

export function Sidebar({ onSearch, onSettings }: SidebarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentSection, setCurrentSection } = useIPTV();

  const handlePress = (item: SidebarItem) => {
    Haptics.selectionAsync();
    if (item.section === "Search") {
      onSearch();
    } else if (item.section === "Settings") {
      onSettings();
    } else {
      setCurrentSection(item.section as Section);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.sidebar,
          paddingTop: topPad + 8,
          paddingBottom: bottomPad + 8,
          borderRightColor: colors.border,
        },
      ]}
    >
      <View style={styles.logo}>
        <Text style={[styles.logoText, { color: colors.primary }]}>tivi</Text>
        <Text style={[styles.logoText, { color: colors.foreground }]}>mate</Text>
      </View>

      <View style={styles.items}>
        {ITEMS.map((item) => {
          const active = item.section === currentSection;
          return (
            <TouchableOpacity
              key={item.section}
              onPress={() => handlePress(item)}
              style={[
                styles.item,
                active && { backgroundColor: colors.highlight },
              ]}
              activeOpacity={0.7}
            >
              <Feather
                name={item.icon}
                size={20}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.itemLabel,
                  {
                    color: active ? colors.foreground : colors.mutedForeground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onSettings}
          style={styles.item}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={20} color={colors.mutedForeground} />
          <Text
            style={[
              styles.itemLabel,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 130,
    borderRightWidth: 1,
    flexDirection: "column",
  },
  logo: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 20,
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  items: {
    flex: 1,
    gap: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  itemLabel: {
    fontSize: 13,
  },
  footer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    paddingTop: 8,
  },
});
