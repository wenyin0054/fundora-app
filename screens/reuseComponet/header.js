// components/AppHeader.js
import React, { useState, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserById } from "../../database/userAuth";

export default function AppHeader({
  title = "Header",
  onLeftPress,
  leftIcon = "arrow-left", 
  showLeftButton = false,  
  onProfileImagePress,
  profileImage: externalProfileImage, 
  showProfile = true,
  style,
}) {
  const navigation = useNavigation();
  const [localProfileImage, setLocalProfileImage] = useState(null);
  const [imageVersion, setImageVersion] = useState(0);

  // 使用 useFocusEffect 替代 useEffect + useIsFocused
  useFocusEffect(
    useCallback(() => {
      if (!externalProfileImage) {
        loadProfileImage();
      }

      // 可选的清理函数
      return () => {
        // 如果需要清理操作，可以在这里进行
      };
    }, [externalProfileImage]) // 依赖数组
  );

  const loadProfileImage = async () => {
    try {
      console.log("🔄 AppHeader: Loading profile image...");
      const stored = await AsyncStorage.getItem("currentUser");
      if (!stored) {
        setLocalProfileImage(null);
        return;
      }

      const user = JSON.parse(stored);
      const userData = await getUserById(user.userId);

      if (userData?.profileImage) {
        console.log("✅ AppHeader: Profile image found:", userData.profileImage);
        setLocalProfileImage(userData.profileImage);
        setImageVersion(prev => prev + 1);
      } else {
        console.log("❌ AppHeader: No profile image found");
        setLocalProfileImage(null);
      }
    } catch (error) {
      console.log("❌ AppHeader: Error loading profile image:", error);
      setLocalProfileImage(null);
    }
  };

  const displayProfileImage = externalProfileImage || localProfileImage;

  const handleProfilePress = () => {
    if (onProfileImagePress) {
      onProfileImagePress();
    } else {
      navigation.navigate('ProfileScreen');
    }
  };

  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress();
    } else {
      navigation.goBack();
    }
  };

  // 生成带时间戳的图片URL，避免缓存
  const getImageSource = () => {
    if (displayProfileImage) {
      return { 
        uri: displayProfileImage + `?v=${imageVersion}&t=${Date.now()}` 
      };
    }
    return require("../../assets/default-avatar.png");
  };

  return (
    <View style={[styles.container, style]}>
      {/* LEFT SECTION */}
      <View style={styles.sideContainer}>
        {showLeftButton ? (
          <TouchableOpacity onPress={handleLeftPress} style={styles.iconButton}>
            <Feather name={leftIcon} size={22} color="black" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* TITLE */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* RIGHT SECTION */}
      <View style={[styles.sideContainer, styles.rightContainer]}>
        {showProfile ? (
          <TouchableOpacity onPress={handleProfilePress}>
            <Image
              source={getImageSource()}
              style={styles.avatar}
              onError={(error) => {
                console.log("🖼️ AppHeader: Image load error:", error.nativeEvent.error);
                setLocalProfileImage(null);
              }}
              key={imageVersion}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  sideContainer: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  rightContainer: {
    justifyContent: "flex-end",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  iconButton: {
    padding: 4,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    width: 35, 
    placeholderTextColor:"#c5c5c5ff",
  },
});