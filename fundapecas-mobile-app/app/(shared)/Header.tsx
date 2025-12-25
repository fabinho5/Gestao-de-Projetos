import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

type HeaderProps = {
  onProfilePress: () => void;
  onLogoutPress: () => void;
};

export default function Header({
  onProfilePress,
  onLogoutPress,
}: HeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    console.log("Logout clicado no Header");
    setMenuVisible(false);
    // Aguarda o menu fechar antes de chamar o callback
    setTimeout(() => {
      onLogoutPress();
    }, 100);
  };

  const handleProfile = () => {
    console.log("Perfil clicado no Header");
    setMenuVisible(false);
    setTimeout(() => {
      onProfilePress();
    }, 100);
  };

  return (
    <View style={styles.container}>
      {/* Left - Logo */}
      <Image
        source={require("../../assets/images/fundapecas.png")}
        style={styles.logo}
        contentFit="contain"
      />

      {/* Right - Actions */}
      <View style={styles.actionsContainer}>

        <TouchableOpacity 
          onPress={() => {
            console.log("Ícone clicado");
            setMenuVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-circle-outline"
            size={36}
            color="#3b82f6"
          />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            console.log("Overlay clicado - fechar menu");
            setMenuVisible(false);
          }}
        >
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.menuText}>Ver perfil</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
                <Text style={[styles.menuText, styles.logout]}>
                  Logout
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    height: 40,
    width: 120,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logoutButton: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menu: {
    width: 160,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  logout: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
});