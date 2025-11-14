import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import AppHeader from "../../reuseComponet/header.js";
import { getExpensesLocal } from "../../../database/SQLite .js";

const screenWidth = Dimensions.get("window").width;
const groupExpensesByMonth = (expenses) => {
    const result = {};

    expenses.forEach(exp => {
        if (exp.typeLabel === "income") return; // only expenses

        const dateObj = new Date(exp.date);
        const month = dateObj.toLocaleString("default", { month: "short" }); // e.g. 'Jan'

        if (!result[month]) result[month] = {};

        if (!result[month][exp.tag]) result[month][exp.tag] = 0;
        result[month][exp.tag] += exp.amount;
    });

    return result;
};
export default function AnalysisDashboard() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedMonth, setSelectedMonth] = useState("April");

    const incomeExpenseData = [
        { name: "Income", population: 3200, color: "#57C0A1", legendFontColor: "#333", legendFontSize: 14 },
        { name: "Expenses", population: 2400, color: "#E5E7EB", legendFontColor: "#333", legendFontSize: 14 },
    ];

    // Replace this old barData
    const [barData, setBarData] = useState(null);

    useEffect(() => {
        const loadExpenses = async () => {
            const allExpenses = await getExpensesLocal();
            const grouped = groupExpensesByMonth(allExpenses);

            // Extract latest 4 months
            const months = Object.keys(grouped).slice(-4);

            // Fixed color mapping
            const colorMap = {
                Groceries: "#57C0A1",
                Transport: "#C084FC",
                Entertainment: "#0F172A",
                Utilities: "#FACC15"
            };

            // Collect totals by tag across months
            const categories = Object.keys(colorMap);

            const datasets = categories.map(tag => ({
                data: months.map(m => grouped[m]?.[tag] || 0),
                barColors: months.map(() => colorMap[tag])
            }));

            setBarData({
                labels: months,
                datasets,
                legend: categories,
            });
        };

        loadExpenses();
    }, []);



    {
        barData ? (
            <BarChart
                data={barData}
                width={screenWidth * 0.82}
                height={250}
                fromZero={true}
                yAxisLabel="RM"
                chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    fillShadowGradientOpacity: 1,
                }}
                style={{ marginVertical: 8 }}
                withCustomBarColorFromData={true}
                flatColor={true}
            />
        ) : (
            <Text style={{ textAlign: "center", color: "#9CA3AF" }}>Loading data...</Text>
        )
    }


    const recentTransactions = [
        { name: "Received salary from employer", amount: "+3,200.00", date: "Apr 28", type: "income" },
        { name: "Dinner with friends at Bistro", amount: "-85.50", date: "Apr 27", type: "expense" },
        { name: "Paid credit card statement", amount: "-1,500.00", date: "Apr 26", type: "expense" },
        { name: "Fuel for weekly commute", amount: "-80.00", date: "Apr 25", type: "expense" },
        { name: "Monthly rent payment", amount: "-1,200.00", date: "Apr 24", type: "expense" },
        { name: "Tuition fee installment", amount: "-750.00", date: "Apr 23", type: "expense" },
    ];

    const categories = [
        { name: "Groceries", color: "#57C0A1" },
        { name: "Transport", color: "#C084FC" },
        { name: "Entertainment", color: "#0F172A" },
        { name: "Utilities", color: "#FACC15" },
    ];
    const totalPerMonth = barData?.labels.map((m, i) =>
        barData.datasets.reduce((sum, ds) => sum + ds.data[i], 0)
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <AppHeader title="Analysis Dashboard" />

            {/* ✅ Dropdown Row */}
            <View style={styles.filterRow}>
                <View style={styles.dropdownContainer}>
                    <Picker
                        selectedValue={selectedCategory}
                        onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                        style={styles.dropdown}
                    >
                        <Picker.Item label="All Categories" value="All" />
                        <Picker.Item label="Groceries" value="Groceries" />
                        <Picker.Item label="Transport" value="Transport" />
                        <Picker.Item label="Entertainment" value="Entertainment" />
                        <Picker.Item label="Utilities" value="Utilities" />
                    </Picker>
                </View>

                <View style={styles.dropdownContainer}>
                    <Picker
                        selectedValue={selectedMonth}
                        onValueChange={(itemValue) => setSelectedMonth(itemValue)}
                        style={styles.dropdown}
                    >
                        <Picker.Item label="January" value="January" />
                        <Picker.Item label="February" value="February" />
                        <Picker.Item label="March" value="March" />
                        <Picker.Item label="April" value="April" />
                    </Picker>
                </View>
            </View>

            {/* ✅ Financial Overview */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Financial Overview</Text>
                <Text style={styles.cardSubtitle}>
                    Income vs. Expenses for {selectedMonth}
                </Text>

                <PieChart
                    data={incomeExpenseData}
                    width={screenWidth * 0.82}
                    height={180}
                    chartConfig={{
                        color: (opacity = 1) => `rgba(87, 192, 161, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"10"}
                    center={[10, 0]}
                    hasLegend={true}
                />
            </View>

            {/* ✅ Monthly Spend Analysis */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly Spend Analysis</Text>
                <Text style={styles.cardSubtitle}>
                    Breakdown of expenses over the last few months
                </Text>
                <View style={{ alignItems: "center", marginBottom: 6 }}>
                    {barData?.labels.map((m, i) => (
                        <Text key={i} style={{ color: "#374151", fontSize: 13 }}>
                            {m}: RM {totalPerMonth[i].toFixed(2)}
                        </Text>
                    ))}
                </View>

                <BarChart
                    data={barData}
                    width={screenWidth * 0.82}
                    height={250}
                    fromZero={true}
                    yAxisLabel="$"
                    chartConfig={{
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        decimalPlaces: 2,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        fillShadowGradientOpacity: 1,
                    }}
                    style={{ marginVertical: 8 }}
                    withCustomBarColorFromData={true}
                    flatColor={true}
                />

                <View style={styles.legendContainer}>
                    {categories.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText}>{item.name}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ✅ Recent Financial Activity */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Financial Activity</Text>
                <Text style={styles.cardSubtitle}>
                    A chronological view of your latest transactions
                </Text>

                {recentTransactions.map((item, index) => (
                    <View key={index} style={styles.transactionRow}>
                        <View style={styles.transactionLeft}>
                            <Text
                                style={styles.transactionName}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {item.name}
                            </Text>
                            <Text style={styles.transactionDate}>{item.date}</Text>
                        </View>

                        <Text
                            style={[
                                styles.transactionAmount,
                                { color: item.type === "income" ? "#10B981" : "#EF4444" },
                            ]}
                        >
                            {item.amount}
                        </Text>
                    </View>))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 20, paddingTop: 40 },
    filterRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
    dropdownContainer: {
        backgroundColor: "#fff",
        borderRadius: 8,
        width: "47%",
        elevation: 2,
    },
    dropdown: { height: 50, color: "#374151" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        overflow: "hidden",
    },
    cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
    cardSubtitle: { color: "#6B7280", fontSize: 12, marginBottom: 10, flexWrap: "wrap" },
    legendContainer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 6 },
    legendItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 10, marginTop: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 13, color: "#374151" },

    transactionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 0.5,
        borderBottomColor: "#E5E7EB",
        paddingVertical: 10,
        gap: 10,
    },
    transactionLeft: {
        flex: 1,
        flexShrink: 1,
        marginRight: 10,
    },
    transactionName: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111827",
        flexShrink: 1,
        flexWrap: "wrap",
    },
    transactionDate: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "right",
        minWidth: 80, // keeps it aligned nicely
    },

});
