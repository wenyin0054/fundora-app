// components/AppHeader.js
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function AppHeader({
    title = "Header",
    onBellPress,
    profileImage,
    style,
}) {
     const navigation = useNavigation();
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.rightSection}>
                <TouchableOpacity onPress={onBellPress}>
                    <Feather name="bell" size={22} color="black" style={{ marginRight: 15 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> navigation.navigate('ProfileScreen')}>
                    <Image
                        source={
                            profileImage
                                ? { uri: profileImage }
                                : require("../../assets/default-avatar.png")
                        }
                        style={styles.avatar}
                    />
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
});
