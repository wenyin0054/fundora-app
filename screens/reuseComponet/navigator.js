import { StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NavigationContainer } from "@react-navigation/native";
import CustomDrawerContent from "./DrawerComponent"; 
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 导入所有 screens
import DashboardScreen from "../Loy Ying Zheng/dashboard";
import AddExpenseScreen from "../Loy Ying Zheng/ExpensesOrganizer/AddExpensesOrIncome";
import ExpenseDetail from "../Loy Ying Zheng/ExpensesOrganizer/ExpensesDetail";
import ExpensesOrganizer from "../Loy Ying Zheng/ExpensesOrganizer/ExpensesOrganizer";
import SavingScreen from "../Loy Ying Zheng/Goal/SavingPlanner";
import BillTracker from "../Loy Ying Zheng/Bills/Bill";
import SetGoal from "../Loy Ying Zheng/Goal/AddGoal";
import TagManagerScreen from "../Loy Ying Zheng/Tag/tagManager";
import AddTag from "../Loy Ying Zheng/Tag/addTag";
import GoalDetailScreen from "../Loy Ying Zheng/Goal/GoalDetailScreen";  
import PeriodicExpenses from "../Loy Ying Zheng/EventTag/PeriodicExpenses";
import AddEventTag from "../Loy Ying Zheng/EventTag/AddEventTag";
import EventTagManager from "../Loy Ying Zheng/EventTag/EventTagManager";
import AddBill from "../Loy Ying Zheng/Bills/AddBill";
import BillDetail from "../Loy Ying Zheng/Bills/BillDetail";
import SeeAllBills from "../Loy Ying Zheng/Bills/SeeAllBill";
import ReceiptScannerScreen from "../Loy Ying Zheng/ExpensesOrganizer/ScanReceipt";
import SavingMethodListScreen from "../Loy Ying Zheng/SavingMethod/SavingMethodListScreen"
import AddSavingMethodScreen from "../Loy Ying Zheng/SavingMethod/AddSavingMethodScreen"
import SavingMethodDetailScreen from "../Loy Ying Zheng/SavingMethod/SavingMethodDetailScreen"
import WithdrawalManagementScreen from "../Loy Ying Zheng/Goal/withdrawalManagementScreen"

// Version 1 特有的 screens
import LoginScreen from "../LaiWenYin/LoginModule/LoginScreen";
import FaceRegistrationScreen from "../LaiWenYin/FaceAuthModule/FaceRegistration";
import RegisterScreen from "../LaiWenYin/LoginModule/Register";
import ForgotPassword from "../LaiWenYin/LoginModule/ForgotPassword";
import ProfileScreen from "../LaiWenYin/ProfileModule/ProfileScreen";
import ResetPassword from "../LaiWenYin/LoginModule/resetPasswordScreen";
import ExpenseAnalysis from "../LaiWenYin/ExpenseAnalysisModule/ExpenseAnalysis";
import OnboardingScreen from "../LaiWenYin/TutorialModule/OnboardingPage";
import OnboardingPage2 from "../LaiWenYin/TutorialModule/OnboardingPage2";
import OnboardingPage3 from "../LaiWenYin/TutorialModule/OnboardingPage3";
import FuturePredictionScreen from "../LaiWenYin/FuturePredictonModule/futurePrediction";
import GoalProjectionScreen from "../LaiWenYin/FuturePredictonModule/GoalProjectionPage";
import DailyQuiz from "../LaiWenYin/TutorialModule/dailyquizPage";
import FaceLoginScreen from "../LaiWenYin/FaceAuthModule/FaceLogin";
import QuizIntroductionScreen from "../LaiWenYin/TutorialModule/QuizIntroductionScreen";
import { UserProvider, useUser } from "./UserContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const linking = {
  prefixes: ["myapp://"],
  config: {
    screens: {
      ResetPassword: "reset",
    },
  },
};

// --------- BOTTOM TABS ----------
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Expenses':
              iconName = 'logo-yen';
              break;
            case 'Saving':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Bills':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#89D0AA',
        tabBarInactiveTintColor: '#565D6D',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expenses" component={ExpensesOrganizer} />
      <Tab.Screen name="Saving" component={SavingScreen} />
      <Tab.Screen name="Bills" component={BillTracker} />
    </Tab.Navigator>
  );
}

// --------- UNIFIED DRAWER (添加缺失的 screens) ----------
function UnifiedDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#EAF8F0", width: 280 },
        drawerActiveTintColor: "#2E5E4E",
      }}
    >
      <Drawer.Screen name="Home" component={MainTabs} />
      <Drawer.Screen name="TagManager" component={TagManagerScreen} />
      <Drawer.Screen name="PeriodicExpenses" component={PeriodicExpenses} />
      <Drawer.Screen name="SavingsPlanner" component={SavingScreen} />
      <Drawer.Screen name="SavingMethodList" component={SavingMethodListScreen} />
      <Drawer.Screen name="WithdrawalManagement" component={WithdrawalManagementScreen} />
      <Drawer.Screen name="EventTagManager" component={EventTagManager} />
    </Drawer.Navigator>
  );
}

// MAIN NAVIGATOR
export default function Navigator() {
  const [firstLaunch, setFirstLaunch] = useState(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (hasLaunched === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setFirstLaunch(true);
        } else {
          setFirstLaunch(false);
        }
      } catch (e) {
        console.log("Error checking first launch:", e);
        setFirstLaunch(false);
      }
    };
    checkFirstLaunch();
  }, []);

  if (firstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#57C0A1" />
      </View>
    );
  }

  return (
    <UserProvider>    
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName={firstLaunch ? "OnboardingScreen" : "Login"}>
          
          {/* 1. Onboarding & Authentication */}
          <Stack.Screen 
            name="OnboardingScreen" 
            component={OnboardingScreen} 
            options={{ title: "Welcome To Fundora", headerShown: true, headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="OnboardingPage2" 
            component={OnboardingPage2} 
            options={{ title: "Welcome To Fundora", headerShown: true, headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="OnboardingPage3" 
            component={OnboardingPage3} 
            options={{ title: "Welcome To Fundora", headerShown: true, headerTitleAlign: 'center' }} 
          />
          
          {/* 2. Authentication Screens */}
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: "Register", headerTitleAlign: 'center', headerShown: true }} 
          />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPassword} 
            options={{ title: "Forgot Password", headerTitleAlign: 'center', headerShown: true }} 
          />
          <Stack.Screen 
            name="ResetPassword" 
            component={ResetPassword} 
            options={{ title: "Reset Password", headerTitleAlign: 'center', headerShown: true }} 
          />
          <Stack.Screen 
            name="FaceLoginScreen" 
            component={FaceLoginScreen} 
            options={{ title: "Face Login", headerShown: false}} 
          />
          <Stack.Screen 
            name="FaceRegistration" 
            component={FaceRegistrationScreen} 
            options={{ title: "Face Registration", headerTitleAlign: 'center', headerShown: true }} 
          />

          {/* 3. Main App Entry */}
          <Stack.Screen name="MainApp" component={UnifiedDrawerNavigator} options={{ headerShown: false }} />

          {/* 4. Core Features */}
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ScanReceipt" component={ReceiptScannerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ExpenseDetail" component={ExpenseDetail} options={{ headerShown: false }} />
          <Stack.Screen name="AddGoal" component={SetGoal} options={{ headerShown: false }} />
          <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddTag" component={AddTag} options={{ headerShown: false }} />
          <Stack.Screen name="AddEventTag" component={AddEventTag} options={{ headerShown: false }} />
          <Stack.Screen name="AddBill" component={AddBill} options={{ headerShown: false }} />
          <Stack.Screen name="BillDetail" component={BillDetail} options={{ headerShown: false }} />
          <Stack.Screen name="SeeAllBill" component={SeeAllBills} options={{ headerShown: false }} />

          {/* 5. Saving Method Management */}
          <Stack.Screen name="AddSavingMethod" component={AddSavingMethodScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SavingMethodDetail" component={SavingMethodDetailScreen} options={{ headerShown: false }} />

          {/* 6. Analysis & Prediction */}
          <Stack.Screen name="ExpenseAnalysis" component={ExpenseAnalysis} options={{ headerShown: false }} />
          <Stack.Screen 
            name="FuturePredictionScreen" 
            component={FuturePredictionScreen} 
            options={{ title: "Future Prediction", headerShown: true, headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="GoalProjectionScreen" 
            component={GoalProjectionScreen} 
            options={{ title: "📈 Goal Projection", headerShown: true, headerTitleAlign: 'center' }} 
          />

          {/* 7. Tutorial & Quiz */}
          <Stack.Screen 
            name="QuizIntroductionScreen" 
            component={QuizIntroductionScreen} 
            options={{ title: "Introduction Quiz", headerShown: true, headerTitleAlign: 'center' }} 
          />
          <Stack.Screen 
            name="DailyQuiz" 
            component={DailyQuiz} 
            options={{ title: "Daily Quiz", headerShown: true, headerTitleAlign: 'center' }} 
          />

          {/* 8. Profile */}
          <Stack.Screen 
            name="ProfileScreen" 
            component={ProfileScreen} 
            options={{ title: "My Profile", headerTitleAlign: 'center', headerShown: true }} 
          />

        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, paddingBottom: 20 },
  eventTagContainer: {
    borderTopWidth: 1,
    borderTopColor: "#d6e8de",
    marginTop: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  eventTagTitle: { fontWeight: "600", color: "#2E5E4E", fontSize: 15, marginBottom: 5 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: "#555", fontSize: 14 },
  dropdownLabel: { fontSize: 13, color: "#555", marginBottom: 4 },
  dropdownWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 8,
  },
  selectedTagText: { marginTop: 5, color: "#2E5E4E", fontSize: 13, fontWeight: "500" },
  activeTagBox: {
    backgroundColor: "#EAF8F0",
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#8AD0AB",
  },
  activeTagText: {
    fontSize: 13,
    color: "#2E5E4E",
    marginBottom: 4,
  },
  bold: { fontWeight: "700" },
});