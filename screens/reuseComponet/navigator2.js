import {  StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NavigationContainer } from "@react-navigation/native";
import CustomDrawerContent from "./DrawerComponent";



// Screens
import DashboardScreen from "../dashboard";
import ExpensesOrganizer from "../ExpensesOrganizer/ExpensesOrganizer";
import SavingScreen from "../Goal/SavingScreen";
import BillTracker from "../Bill";
import AddExpenseScreen from "../ExpensesOrganizer/AddExpensesOrIncome";
import ReceiptScannerScreen from "../ExpensesOrganizer/ScanReceipt";
import ExpenseDetail from "../ExpensesOrganizer/ExpensesDetail";
import SetGoal from "../Goal/AddGoal";
import AddTag from "../Tag/addTag";
import TagManagerScreen from "../Tag/tagManager";
import PeriodicExpenses from "../EventTag/PeriodicExpenses";
import TagManager from "../Tag/tagManager";
import AddEventTag from "../EventTag/AddEventTag";
import EventTagManager from "../EventTag/EventTagManager";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();


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

// --------- DRAWER ----------

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#EAF8F0", width: 240 },
        drawerActiveTintColor: "#2E5E4E",
      }}
    >
      <Drawer.Screen name="Home" component={MainTabs} />
      <Drawer.Screen name="TagManager" component={TagManagerScreen} options={{ title: "Manage Tags" }} />
      <Drawer.Screen name="Periodic Expenses" component={PeriodicExpenses} />
    </Drawer.Navigator>
  );
}


// --------- MAIN NAVIGATOR ----------
export default function Navigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Drawer">
        {/* Wrap tabs inside drawer */}
        <Stack.Screen name="Drawer" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense', headerShown: false }} />
        <Stack.Screen name="ScanReceipt" component={ReceiptScannerScreen} options={{ title: 'Scan Receipt', headerShown: false }} />
        <Stack.Screen name="AddGoal" component={SetGoal} options={{ title: 'Set Goal',headerShown: false }} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetail} options={{ title: 'Expense Detail', headerShown: false }} />
        <Stack.Screen name="AddTag" component={AddTag} options={{ title: 'Add Tag', headerShown: false }} />
        <Stack.Screen name="TagManagerScreen" component={TagManager} options={{ title: 'Manage Tag', headerShown: false }} />
        <Stack.Screen name="PeriodicExpenses" component={PeriodicExpenses} options={{ title: 'Periodic Expenses', headerShown: false }} />
        <Stack.Screen name="AddEventTag" component={AddEventTag} options={{ title: 'Add Event Tag', headerShown: false }} />
        <Stack.Screen name="EventTagManager" component={EventTagManager} options={{ title: 'Event Tags', headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
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
