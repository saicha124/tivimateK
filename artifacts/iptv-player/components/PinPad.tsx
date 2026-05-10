import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PIN_LENGTH = 4;

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

interface PinPadProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  maxAttempts?: number;
}

export function PinPad({
  visible,
  title,
  subtitle,
  onSuccess,
  onCancel,
  onVerify,
  maxAttempts = 5,
}: PinPadProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin("");
      setError("");
      setAttempts(0);
      setLocked(false);
    }
  }, [visible]);

  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleKey = useCallback(async (key: string) => {
    if (locked) return;

    if (key === "del") {
      Haptics.selectionAsync();
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }

    if (key === "") return;

    const newPin = pin + key;
    setPin(newPin);
    Haptics.selectionAsync();

    if (newPin.length === PIN_LENGTH) {
      const ok = await onVerify(newPin);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPin("");
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shake();
        setPin("");

        if (newAttempts >= maxAttempts) {
          setLocked(true);
          setError(`Too many attempts. Try again in 30 seconds.`);
          setTimeout(() => {
            setLocked(false);
            setAttempts(0);
            setError("");
          }, 30000);
        } else {
          setError(`Incorrect PIN (${maxAttempts - newAttempts} attempts left)`);
        }
      }
    }
  }, [locked, pin, attempts, maxAttempts, onVerify, onSuccess, shake]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={[styles.lockIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="lock" size={22} color={colors.primary} />
            </View>
            <View style={{ width: 36 }} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          )}

          {/* PIN dots */}
          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < pin.length
                        ? error
                          ? colors.destructive
                          : colors.primary
                        : colors.border,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Error message */}
          <View style={styles.errorContainer}>
            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            ) : (
              <Text style={[styles.errorText, { color: "transparent" }]}>placeholder</Text>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {KEYS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keyRow}>
                {row.map((key, colIdx) => {
                  if (key === "") {
                    return <View key={colIdx} style={styles.keyPlaceholder} />;
                  }
                  if (key === "del") {
                    return (
                      <TouchableOpacity
                        key={colIdx}
                        onPress={() => handleKey("del")}
                        style={[styles.key, { backgroundColor: colors.secondary }]}
                        activeOpacity={0.65}
                      >
                        <Feather name="delete" size={20} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={colIdx}
                      onPress={() => handleKey(key)}
                      style={[styles.key, { backgroundColor: colors.secondary }]}
                      activeOpacity={0.65}
                      disabled={locked}
                    >
                      <Text style={[styles.keyText, { color: colors.foreground }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  lockIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  errorContainer: {
    height: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  keypad: {
    width: "100%",
    gap: 10,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  key: {
    width: 72,
    height: 64,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
  },
  keyPlaceholder: {
    width: 72,
    height: 64,
  },
});
