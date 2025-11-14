// components/AppHeader.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function AppHeader({
    title = "Header",
    style,
    showBackButton = false, // optional back button
}) {
    const navigation = useNavigation();

    return (
        <View style={styles.headerWrapper}>
            <View style={[styles.container, style]}>
                {/* Left section (back button if needed) */}
                <View style={styles.leftSection}>
                    {showBackButton && (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Feather name="arrow-left" size={24} color="black" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Center title */}
                <View style={styles.centerSection}>
                    <Text style={styles.title}>{title}</Text>
                </View>

                {/* Right placeholder to keep title centered */}
                <View style={styles.rightSection} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // ✅ full-width bottom border here
    headerWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: "#D1D5DB", // slightly darker for visibility
        backgroundColor: "#fff",
    },
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20, // keep nice spacing for content
        paddingTop: 50,
        paddingBottom: 12,
    },
    leftSection: {
        width: 40,
        alignItems: "flex-start",
    },
    backButton: {
        padding: 4,
    },
    centerSection: {
        flex: 1,
        alignItems: "center",
    },
    rightSection: {
        width: 40, // keeps the title perfectly centered
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
    },
});
