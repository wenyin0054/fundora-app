import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

/* Imports */
import DashboardScreen from "../dashboard";
import AddExpenseScreen from "../AddExpensesOrIncome";
import ExpensesDetail from "../ExpensesDetail";
import ExpensesOrganizer from "../ExpensesOrganizer";
import SavingScreen from "../SavingScreen";
import BillTracker from "../Bill";
import SetGoal from "../SetGoal";
import TagManager from "../tagManager";
import TagList from "../tagList";
import AddTag from "../addTag";
import GoalDetailScreen from "../SetGoal";  
import AddGoalScreen from "../AddGoal";


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
import FaceRegistrations from "../LaiWenYin/FaceAuthModule/FaceRegistration";
import FuturePredictionScreen from "../LaiWenYin/FuturePredictonModule/futurePrediction";
import { StackScreenLifecycleState } from "react-native-screens";
import GoalProjectionScreen from "../LaiWenYin/FuturePredictonModule/GoalProjectionPage";
import DailyQuiz from "../LaiWenYin/TutorialModule/dailyquizPage";
import FaceLoginScreen from "../LaiWenYin/FaceAuthModule/FaceLogin";
import QuizIntroductionScreen from "../LaiWenYin/TutorialModule/QuizIntroductionScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ["myapp://"],
  config: {
    screens: {
      ResetPassword: "reset",
    },
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Expenses":
              iconName = "logo-yen";
              break;
            case "Saving":
              iconName = focused ? "wallet" : "wallet-outline";
              break;
            case "Bills":
              iconName = focused ? "receipt" : "receipt-outline";
              break;
            default:
              iconName = "ellipse";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#89D0AA",
        tabBarInactiveTintColor: "#565D6D",
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
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={firstLaunch ? "OnboardingScreen" : "Login"}
      >
        {/* Onboarding */}
        <Stack.Screen
          name="OnboardingScreen"
          component={OnboardingScreen}
          options={{ title: "Welcome To Fundora", headerShown: true ,headerTitleAlign: 'center',fontWeight:800}}
        />
        <Stack.Screen name="FuturePredictionScreen" 
        component={FuturePredictionScreen}
          options={{
            title: "Future Prediction", headerShown: true,
            headerTitleAlign: 'center', fontWeight: 800
          }} />
          <Stack.Screen name="FaceLoginScreen" 
        component={FaceLoginScreen}
          options={{
            title: "Face Login", headerShown: true,
            headerTitleAlign: 'center', fontWeight: 800
          }} />
        {/* Main Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />

        {/* Other Screens */}
        <Stack.Screen name="GoalProjectionScreen" component={GoalProjectionScreen}/>

        <Stack.Screen name="QuizIntroductionScreen" component={QuizIntroductionScreen}
        options={{title:"Introduction Quiz", headerShown: true ,headerTitleAlign: 'center',fontWeight:800}}/>
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: "Add Expense", headerShown: false }}
        />
        <Stack.Screen
          name="ExpensesDetail"
          component={ExpensesDetail}
          options={{ title: "Expense Detail", headerShown: false }}
        />
        <Stack.Screen
          name="ExpensesOrganizer"
          component={ExpensesOrganizer}
          options={{ title: "Expenses Organizer", headerShown: false }}
        />
        <Stack.Screen
          name="SavingScreen"
          component={SavingScreen}
          options={{ title: "Savings Planner", headerShown: false }}
        />

        <Stack.Screen
          name="BillTracker"
          component={BillTracker}
          options={{ title: "Bill & DSR Tracker", headerShown: false }}
        />
        <Stack.Screen
          name="SetGoal"
          component={SetGoal}
          options={{ title: "Set Savings Goal", headerShown: false }}
        />
        <Stack.Screen
          name="TagManagerScreen"
          component={TagManager}
          options={{ title: "Tag Manager", headerShown: false }}
        />
        <Stack.Screen
          name="TagList"
          component={TagList}
          options={{ title: "Tags List", headerShown: false }}
        />
        <Stack.Screen
          name="AddTag"
          component={AddTag}
          options={{ title: "Add New Tag", headerShown: false }}
        />
        <Stack.Screen
          name="GoalDetailScreen"
          component={GoalDetailScreen}
          options={{ title: "Goal Detail", headerShown: false }}
        />
        <Stack.Screen
          name="AddGoal"
          component={AddGoalScreen}
          options={{ title: "Set Goal", headerShown: false }}
        />
        
        {/* Lai Wen Yin’s Screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FaceRegistration"
          component={FaceRegistrationScreen}
          options={{ title: "Face Registration",headerTitleAlign: 'center', headerShown: true }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Register",headerTitleAlign: 'center', headerShown: true }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{ title: "Forgot Password",headerTitleAlign: 'center', headerShown: true }}
        />
        <Stack.Screen
          name="ProfileScreen"
          component={ProfileScreen}
          options={{ title: "My Profile",headerTitleAlign: 'center', headerShown: true }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPassword}
          options={{ title: "Reset Password",headerTitleAlign: 'center', headerShown: true }}
        />
        <Stack.Screen
          name="ExpenseAnalysis"
          component={ExpenseAnalysis}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="OnboardingPage2"
          component={OnboardingPage2}
          options={{ title: "Welcome To Fundora", headerShown: true ,headerTitleAlign: 'center',fontWeight:800 }}
        />
        <Stack.Screen
          name="OnboardingPage3"
          component={OnboardingPage3}
          options={{ title: "Welcome To Fundora", headerShown: true ,headerTitleAlign: 'center',fontWeight:800 }}
        />

        <Stack.Screen
          name="FaceRegistrations"
          component={FaceRegistrations}
          options={{ title: "Face Registration", headerShown: true }}
        />

        <Stack.Screen
          name="DailyQuiz"
          component={DailyQuiz}
          options={{ title: "Daily Quiz", headerShown: true ,headerTitleAlign: 'center',fontWeight:800 }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
