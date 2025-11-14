import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";

/*LoyYingZheng's Imports*/
import DashboardScreen from "../LoyYingZheng/dashboard";
import ExpensesOrganizer from "../LoyYingZheng/ExpensesOrganizer/ExpensesOrganizer";
import SavingScreen from "../LoyYingZheng/Goal/SavingScreen";
import BillTracker from "../LoyYingZheng/Bill";
import AddExpenseScreen from "../LoyYingZheng/ExpensesOrganizer/AddExpensesOrIncome";
import ReceiptScannerScreen from "../LoyYingZheng/ExpensesOrganizer/ScanReceipt";
import ExpensesDetail from "../LoyYingZheng/ExpensesOrganizer/ExpensesOrganizer";
import SetGoal from "../LoyYingZheng/Goal/AddGoal";
import AddTag from "../LoyYingZheng/Tag/addTag";
import TagManager from "../LoyYingZheng/Tag/tagManager";
import PeriodicExpenses from "../LoyYingZheng/EventTag/PeriodicExpenses";
import AddEventTag from "../LoyYingZheng/EventTag/AddEventTag";
import EventTagManager from "../LoyYingZheng/EventTag/EventTagManager";


/*LaiWenYin's Imports*/
import LoginScreen from "../LaiWenYin/LoginModule/LoginScreen";
import FaceRegistrationScreen from "../LaiWenYin/FaceAuthModule/FaceRegistration";
import RegisterScreen from "../LaiWenYin/LoginModule/Register";
import ForgotPassword from "../LaiWenYin/LoginModule/ForgotPassword";
import ProfileScreen from "../LaiWenYin/ProfileModule/ProfileScreen";
import ResetPassword from "../LaiWenYin/LoginModule/resetPasswordScreen";
import ExpenseAnalysis from "../LaiWenYin/ExpenseAnalysisModule/ExpenseAnalysis";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ✅ Define deep linking
const linking = {
  prefixes: ["myapp://"],
  config: {
    screens: {
      ResetPassword: "reset", // myapp://reset?email=...&token=...
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
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="MainTabs">
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense', headerShown: false }} />
               <Stack.Screen name="ScanReceipt" component={ReceiptScannerScreen} options={{ title: 'Scan Receipt', headerShown: false }} />
               <Stack.Screen name="AddGoal" component={SetGoal} options={{ title: 'Set Goal',headerShown: false }} />
               <Stack.Screen name="ExpenseDetail" component={ExpenseDetail} options={{ title: 'Expense Detail', headerShown: false }} />
               <Stack.Screen name="AddTag" component={AddTag} options={{ title: 'Add Tag', headerShown: false }} />
               <Stack.Screen name="TagManagerScreen" component={TagManager} options={{ title: 'Manage Tag', headerShown: false }} />
               <Stack.Screen name="PeriodicExpenses" component={PeriodicExpenses} options={{ title: 'Periodic Expenses', headerShown: false }} />
               <Stack.Screen name="AddEventTag" component={AddEventTag} options={{ title: 'Add Event Tag', headerShown: false }} />
               <Stack.Screen name="EventTagManager" component={EventTagManager} options={{ title: 'Event Tags', headerShown: false }} />
    
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FaceRegistration"
          component={FaceRegistrationScreen}
          options={{ headerShown: "Face Registration" }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: "Register" }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{ headerShown: "Forgot Passowrd" }}
        />
        <Stack.Screen
          name="ProfileScreen"
          component={ProfileScreen}
          options={{ title: "My Profile" }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPassword}
          options={{ title: "Reset Password" }}
        />
        <Stack.Screen
          name="ExpenseAnalysis"
          component={require("../LaiWenYin/ExpenseAnalysisModule/ExpenseAnalysis").default}
          options={{ title: "Expense Analysis" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
