// components/AppHeader.js
import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserById } from "../../database/userAuth";

export default function AppHeader({ title = "Header", onBellPress, style }) {
    const navigation = useNavigation();
    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        loadProfileImage();
    }, []);

    const loadProfileImage = async () => {
        try {
            const stored = await AsyncStorage.getItem("currentUser");
            if (!stored) return;

            const user = JSON.parse(stored);
            const userData = await getUserById(user.userId);

            if (userData?.profileImage) {
                setProfileImage(userData.profileImage);
            }
        } catch (error) {
            console.log("❌ Error loading header image:", error);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.rightSection}>
                <TouchableOpacity onPress={onBellPress}>
                    <Feather
                        name="bell"
                        size={22}
                        color="black"
                        style={{ marginRight: 15 }}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")}>
                    <View style={{ position: "relative" }}>
                        <Image
                            source={
                                profileImage
                                    ? { uri: profileImage }
                                    : require("../../assets/default-avatar.png")
                            }
                            style={styles.avatar}
                        />

                        {/* GREEN DOT */}
                        <View style={styles.greenDot} />
                    </View>
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#EAEAEA",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
        fontFamily: "Inter_700Bold",
    },
    rightSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 18,
    },
    greenDot: {
    position: "absolute",
    width: 13,
    height: 13,
    backgroundColor: "#4CAF50", // Green
    borderRadius: 8,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: "#fff", // White border like Facebook
},

});
