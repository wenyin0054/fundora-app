import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserById, getExperienceLevel, updateExperienceLevel } from '../../database/userAuth';
import { initDB } from '../../database/SQLite';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [userLevel, setUserLevel] = useState('beginner');
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored session ONCE when app starts
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize database once at app startup
        await initDB();
        console.log("✅ Database initialized at app startup");
      } catch (error) {
        console.error("❌ Failed to initialize database:", error);
      }

      const stored = await AsyncStorage.getItem('currentUser');
      if (stored) {
        const user = JSON.parse(stored);
        setUserId(user.userId); // triggers second effect
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Reload user data every time userId changes (login/logout/switch user)
  useEffect(() => {
    const reloadUserData = async () => {
      if (!userId) {
        setUserData(null);
        setUserLevel('beginner');
        return setIsLoading(false);
      }

      setIsLoading(true);
      try {
        const userDetails = await getUserById(userId);
        setUserData(userDetails || null);

        const level = await getExperienceLevel(userId);
        setUserLevel(level || 'beginner');
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    reloadUserData();
  }, [userId]);

  // Update user level
  const updateUserLevel = async (newLevel) => {
    if (!userId) return false;

    const success = await updateExperienceLevel(userId, newLevel);
    if (success) {
      setUserLevel(newLevel);
      return true;
    }
    return false;
  };

  // Logout function
  const logout = async () => {
    await AsyncStorage.removeItem("currentUser");
    setUserId(null);       // This resets everything
    setUserData(null);
    setUserLevel("beginner");
  };

  const calculateAndUpdateLevel = async (financialData) => {
    if (!userId) return 'beginner';

    const { totalSavings, monthsActive, goalsAchieved } = financialData;

    let newLevel = 'beginner';
    if (monthsActive >= 12 && totalSavings > 10000 && goalsAchieved >= 3) newLevel = 'expert';
    else if (monthsActive >= 6 && totalSavings > 5000 && goalsAchieved >= 1) newLevel = 'intermediate';

    if (newLevel !== userLevel) {
      await updateUserLevel(newLevel);
    }

    return newLevel;
  };

  const value = {
    userId,
    userLevel,
    userData,
    isLoading,
    setUserId,
    updateUserLevel,
    calculateAndUpdateLevel,
    logout
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

// Helper hook
export const useUserLevelTips = () => {
  const { userLevel, isLoading } = useUser();

  return {
    tipLevel: isLoading ? 'beginner' : userLevel,
    showDetailedTips: userLevel === 'intermediate' || userLevel === 'expert',
    showBasicTips: userLevel === 'beginner',
    isLoading,
  };
};
