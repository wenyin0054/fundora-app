import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import AppHeader from "../../reuseComponet/header.js";
import { getExpensesLocal } from "../../../database/SQLite.js";
import { useUser } from "../../reuseComponet/UserContext.js";

const screenWidth = Dimensions.get("window").width;

// Helper function to round to 2 decimals
const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Function to check if category is income-related
const isIncomeCategory = (category) => {
    if (!category) return false;
    const incomeKeywords = ['income', 'salary', 'revenue', 'earnings', 'paycheck', 'wage'];
    return incomeKeywords.some(keyword =>
        category.toLowerCase().includes(keyword.toLowerCase())
    );
};

// Enhanced groupExpensesByMonth with date sorting
const groupExpensesByMonth = (expenses) => {
    const result = {};

    expenses.forEach((exp) => {
        if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;

        const dateObj = new Date(exp.date);
        const month = dateObj.toLocaleString("default", { month: "short" });
        const year = dateObj.getFullYear();
        const monthYear = `${month} ${year}`;

        if (!result[monthYear]) result[monthYear] = {
            month: month,
            year: year,
            date: dateObj,
            data: {}
        };

        const tag = exp.tag || 'Other';
        if (isIncomeCategory(tag)) return;

        if (!result[monthYear].data[tag]) result[monthYear].data[tag] = 0;
        result[monthYear].data[tag] += exp.amount;
    });

    return result;
};

// Get category-specific financial data
const getCategoryFinancialData = (expenses, selectedCategory) => {
    if (selectedCategory === "All") return getIncomeExpenseData(expenses);

    let categoryExpenses = 0;
    let totalExpenses = 0;
    let totalIncome = 0;

    expenses.forEach((exp) => {
        if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) {
            totalIncome += exp.amount;
        } else {
            totalExpenses += exp.amount;
            if (exp.tag === selectedCategory) {
                categoryExpenses += exp.amount;
            }
        }
    });

    const otherExpenses = totalExpenses - categoryExpenses;

    return [
        {
            name: "Income",
            population: roundToTwo(totalIncome),
            color: "#57C0A1",
            legendFontColor: "#7C3AED",
            legendFontSize: 12,
        },
        {
            name: selectedCategory.length > 12 ? selectedCategory.substring(0, 12) + '...' : selectedCategory,
            population: roundToTwo(categoryExpenses),
            color: "#C084FC",
            legendFontColor: "#7C3AED",
            legendFontSize: 12,
        },
        {
            name: "Other Exp",
            population: roundToTwo(otherExpenses),
            color: "#E5E7EB",
            legendFontColor: "#7C3AED",
            legendFontSize: 12,
        },
    ];
};

const getIncomeExpenseData = (expenses) => {
    let totalIncome = 0;
    let totalExpenses = 0;

    expenses.forEach((exp) => {
        if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) {
            totalIncome += exp.amount;
        } else {
            totalExpenses += exp.amount;
        }
    });

    return [
        {
            name: "Income",
            population: roundToTwo(totalIncome),
            color: "#57C0A1",
            legendFontColor: "#7C3AED",
            legendFontSize: 12,
        },
        {
            name: "Expenses",
            population: roundToTwo(totalExpenses),
            color: "#E5E7EB",
            legendFontColor: "#7C3AED",
            legendFontSize: 12,
        },
    ];
};

const getRecentTransactions = (expenses) => {
    const sortedExpenses = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);

    return sortedExpenses.map(exp => ({
        name: exp.payee,
        amount: exp.typeLabel === "income" || isIncomeCategory(exp.tag)
            ? `+RM${roundToTwo(exp.amount).toFixed(2)}`
            : `-RM${roundToTwo(exp.amount).toFixed(2)}`,
        date: new Date(exp.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        }),
        type: (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) ? "income" : "expense",
        category: exp.tag || 'Other'
    }));
};

const getAvailableMonths = (expenses) => {
    const monthsSet = new Set();

    expenses.forEach(exp => {
        const dateObj = new Date(exp.date);
        const month = dateObj.toLocaleString("default", { month: "long" });
        monthsSet.add(month);
    });

    return Array.from(monthsSet).sort((a, b) => {
        const months = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        return months.indexOf(a) - months.indexOf(b);
    });
};

// Get filtered expenses
const getFilteredExpenses = (expenses, selectedCategory, selectedMonth) => {
    return expenses.filter(exp => {
        if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) {
            return false;
        }

        const expenseMonth = new Date(exp.date).toLocaleString("default", { month: "long" });
        const monthMatch = selectedMonth === "All" || expenseMonth === selectedMonth;
        const categoryMatch = selectedCategory === "All" || exp.tag === selectedCategory;
        return monthMatch && categoryMatch;
    });
};

// Get category insights
const getCategoryInsights = (expenses, selectedCategory) => {
    if (selectedCategory === "All") return null;

    const categoryExpenses = expenses.filter(exp =>
        exp.typeLabel !== "income" && !isIncomeCategory(exp.tag) && exp.tag === selectedCategory
    );

    const totalSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transactionCount = categoryExpenses.length;
    const averageTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;

    const topTransactions = categoryExpenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    return {
        totalSpent: roundToTwo(totalSpent),
        transactionCount,
        averageTransaction: roundToTwo(averageTransaction),
        topTransactions: topTransactions.map(t => ({
            ...t,
            amount: roundToTwo(t.amount)
        }))
    };
};

// Calculate spending insights - FIXED PERCENTAGE ISSUE
const calculateSpendingInsights = (barData, totalPerMonth) => {
    if (!barData || !totalPerMonth || totalPerMonth.length === 0) return null;

    const categoryTotals = barData.datasets.map((dataset, index) => ({
        category: barData.legend[index],
        total: roundToTwo(dataset.data.reduce((sum, val) => sum + val, 0)),
        color: dataset.color ? dataset.color(1) : '#CCCCCC'
    })).sort((a, b) => b.total - a.total);

    const topCategory = categoryTotals[0];
    const totalSpending = roundToTwo(categoryTotals.reduce((sum, item) => sum + item.total, 0));

    let trendInsight = null;
    if (totalPerMonth.length > 1) {
        const latestMonth = totalPerMonth[totalPerMonth.length - 1];
        const previousMonth = totalPerMonth[totalPerMonth.length - 2];
        const absoluteChange = roundToTwo(latestMonth - previousMonth);

        // Only calculate percentage if it makes sense
        if (previousMonth > 0 && previousMonth >= 20) { // Only use percentage if previous month >= RM 20
            const change = roundToTwo((absoluteChange / previousMonth * 100));

            // Cap at reasonable percentages to avoid absurd numbers
            const reasonableChange = Math.min(Math.max(change, -100), 200); // Cap between -100% and +200%

            if (Math.abs(reasonableChange) > 5) { // Only show changes > 5%
                trendInsight = {
                    change: reasonableChange,
                    absoluteChange: absoluteChange,
                    isIncrease: reasonableChange > 0,
                    latestMonth: barData.labels[barData.labels.length - 1],
                    previousMonth: barData.labels[barData.labels.length - 2],
                    type: 'percentage'
                };
            }
        } else if (Math.abs(absoluteChange) >= 10) { // Use absolute for small bases, only if change >= RM 10
            trendInsight = {
                absoluteChange: absoluteChange,
                isIncrease: absoluteChange > 0,
                latestMonth: barData.labels[barData.labels.length - 1],
                previousMonth: barData.labels[barData.labels.length - 2],
                type: 'absolute'
            };
        }
    }

    return {
        topCategory,
        totalSpending,
        trendInsight,
        categoryTotals
    };
};

// Generate colors for dynamic categories
const generateCategoryColors = (categories) => {
    const baseColors = [
        '#57C0A1', '#C084FC', '#0F172A', '#FACC15', '#3B82F6',
        '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ];

    const colorMap = {};
    categories.forEach((category, index) => {
        if (!isIncomeCategory(category)) {
            colorMap[category] = baseColors[index % baseColors.length];
        }
    });

    return colorMap;
};

export default function AnalysisDashboard() {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedMonth, setSelectedMonth] = useState("All");
    const [barData, setBarData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allCategories, setAllCategories] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [incomeExpenseData, setIncomeExpenseData] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    const [categoryColors, setCategoryColors] = useState({});
    const [categoryInsights, setCategoryInsights] = useState(null);
    const { userId, isLoading: userLoading } = useUser(); // Use useUser to get userId

    useEffect(() => {
        const loadExpenses = async () => {
            try {
                const expenses = await getExpensesLocal(userId);
                setAllExpenses(expenses);

                if (!expenses || expenses.length === 0) {
                    setBarData(null);
                    setIncomeExpenseData([]);
                    setRecentTransactions([]);
                    setLoading(false);
                    return;
                }

                const allTags = [...new Set(expenses
                    .map(exp => exp.tag || 'Other')
                    .filter(tag => !isIncomeCategory(tag))
                )];
                setAllCategories(allTags);

                const months = getAvailableMonths(expenses);
                setAvailableMonths(months);

                processData(expenses, "All", "All");

            } catch (error) {
                console.error("Error loading expenses:", error);
                setBarData(null);
                setIncomeExpenseData([]);
                setRecentTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        loadExpenses();
    }, []);

    useEffect(() => {
        if (allExpenses.length > 0) {
            processData(allExpenses, selectedCategory, selectedMonth);
        }
    }, [selectedCategory, selectedMonth]);

    const processData = (expenses, category, month) => {
        const filtered = getFilteredExpenses(expenses, category, month);

        const financialData = category === "All"
            ? getIncomeExpenseData(expenses)
            : getCategoryFinancialData(expenses, category);
        setIncomeExpenseData(financialData);

        const transactions = getRecentTransactions(expenses);
        setRecentTransactions(transactions);

        if (category !== "All") {
            const insights = getCategoryInsights(expenses, category);
            setCategoryInsights(insights);
        } else {
            setCategoryInsights(null);
        }

        const grouped = groupExpensesByMonth(filtered);
        const sortedMonthKeys = Object.keys(grouped).sort((a, b) =>
            new Date(grouped[a].date) - new Date(grouped[b].date)
        );

        const monthsForChart = sortedMonthKeys.slice(-4);

        if (monthsForChart.length === 0) {
            setBarData(null);
            return;
        }

        const allTags = new Set();
        monthsForChart.forEach(monthKey => {
            const monthData = grouped[monthKey];
            Object.keys(monthData.data).forEach(tag => {
                if (!isIncomeCategory(tag)) {
                    allTags.add(tag);
                }
            });
        });

        const uniqueCategories = Array.from(allTags);
        const colorMap = generateCategoryColors(uniqueCategories);
        setCategoryColors(colorMap);

        const data = {
            labels: monthsForChart.map(monthKey => grouped[monthKey].month),
            datasets: uniqueCategories.map(category => ({
                data: monthsForChart.map(monthKey => roundToTwo(grouped[monthKey].data[category] || 0)),
                color: () => colorMap[category],
            })),
            legend: uniqueCategories
        };

        setBarData(data);
    };

    const totalPerMonth = barData?.labels
        ? barData.labels.map((m, i) =>
            roundToTwo(barData.datasets.reduce((sum, ds) => sum + ds.data[i], 0))
        )
        : [];

    const spendingInsights = calculateSpendingInsights(barData, totalPerMonth);

    const categoriesForLegend = allCategories.length > 0
        ? allCategories.filter(cat => !isIncomeCategory(cat))
        : ['Groceries', 'Transport', 'Entertainment', 'Utilities'];

    return (
        <View style={styles.container}>
            <AppHeader title="Financial Analysis" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Filter Section */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Filter View</Text>
                    <View style={styles.filterRow}>
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Category</Text>
                            <View style={styles.dropdownContainer}>
                                <Picker
                                    selectedValue={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                    style={styles.dropdown}
                                >
                                    <Picker.Item label="All Categories" value="All" />
                                    {categoriesForLegend.map((category, index) => (
                                        <Picker.Item
                                            key={index}
                                            label={category}
                                            value={category}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Time Period</Text>
                            <View style={styles.dropdownContainer}>
                                <Picker
                                    selectedValue={selectedMonth}
                                    onValueChange={setSelectedMonth}
                                    style={styles.dropdown}
                                >
                                    <Picker.Item label="All Months" value="All" />
                                    {availableMonths.map((month, index) => (
                                        <Picker.Item key={index} label={month} value={month} />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {(selectedCategory !== "All" || selectedMonth !== "All") && (
                        <TouchableOpacity
                            style={styles.clearFilterButton}
                            onPress={() => {
                                setSelectedCategory("All");
                                setSelectedMonth("All");
                            }}
                        >
                            <Text style={styles.clearFilterText}>Clear Filters</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Financial Overview */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            {selectedCategory === "All" ? "Financial Overview" : `${selectedCategory} Analysis`}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {selectedCategory === "All"
                                ? selectedMonth === "All" ? "All Time Period" : `${selectedMonth}`
                                : `Deep dive into ${selectedCategory}`
                            }
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
                    ) : incomeExpenseData.length > 0 ? (
                        <View style={styles.enhancedPieContainer}>
                            <PieChart
                                data={incomeExpenseData.map((item, index) => ({
                                    ...item,
                                    legendFontSize: 14,
                                    legendFontColor: "#374151",
                                }))}
                                width={Math.min(screenWidth - 60, 320)}
                                height={200}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="75"
                                center={[0, 0]}
                                absolute
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
                                }}
                                hasLegend={false}
                            />

                            {/* CUSTOM LEGEND */}
                            <View style={styles.pieLegendContainer}>
                                {incomeExpenseData.map((item, index) => (
                                    <View key={index} style={styles.pieLegendRow}>
                                        <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                                        <Text style={styles.pieLegendLabel}>
                                            {item.name}: RM{item.population.toLocaleString()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                    ) : (
                        <Text style={styles.noDataText}>No financial data available</Text>
                    )}

                    {selectedCategory !== "All" && categoryInsights && (
                        <View style={styles.categoryStats}>
                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>RM{categoryInsights.totalSpent.toFixed(2)}</Text>
                                    <Text style={styles.statLabel}>Total Spent</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{categoryInsights.transactionCount}</Text>
                                    <Text style={styles.statLabel}>Transactions</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>RM{categoryInsights.averageTransaction.toFixed(2)}</Text>
                                    <Text style={styles.statLabel}>Avg/Transaction</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Monthly Spend Analysis */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            {selectedCategory === "All" ? "Monthly Spending" : `${selectedCategory} Trend`}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {selectedCategory === "All" ? "Last 4 months" : `${selectedCategory} monthly trend`}
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
                    ) : barData && barData.datasets.length > 0 ? (
                        <>
                            {/* Monthly Summary */}
                            <View style={styles.monthlySummary}>
                                {barData.labels.map((m, i) => {
                                    const currentTotal = totalPerMonth[i];
                                    const prevTotal = i > 0 ? totalPerMonth[i - 1] : null;
                                    let trendDisplay = null;

                                    if (prevTotal && prevTotal >= 20) {
                                        let trend = roundToTwo(((currentTotal - prevTotal) / prevTotal * 100));
                                        trend = Math.min(Math.max(trend, -100), 200);
                                        if (Math.abs(trend) > 5) {
                                            trendDisplay = (
                                                <Text style={[
                                                    styles.trendText,
                                                    { color: trend >= 0 ? '#EF4444' : '#10B981' }
                                                ]}>
                                                    {trend >= 0 ? '↑' : '↓'}{Math.abs(trend).toFixed(0)}%
                                                </Text>
                                            );
                                        }
                                    } else if (prevTotal) {
                                        const absoluteChange = Math.abs(roundToTwo(currentTotal - prevTotal));
                                        if (absoluteChange >= 10) {
                                            trendDisplay = (
                                                <Text style={[
                                                    styles.trendText,
                                                    { color: currentTotal >= prevTotal ? '#EF4444' : '#10B981' }
                                                ]}>
                                                    {currentTotal >= prevTotal ? '↑' : '↓'}RM{absoluteChange.toFixed(0)}
                                                </Text>
                                            );
                                        }
                                    }

                                    return (
                                        <View key={i} style={styles.monthSummaryItem}>
                                            <Text style={styles.monthLabel}>{m}</Text>
                                            <Text style={styles.monthTotal}>RM{currentTotal?.toFixed(0)}</Text>
                                            {trendDisplay}
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Bar Chart */}
                            <View style={styles.enhancedBarContainer}>
                                <BarChart
                                    data={barData}
                                    width={Math.min(screenWidth - 40, 350)}
                                    height={240}
                                    fromZero={true}
                                    showValuesOnTopOfBars={false}
                                    withInnerLines={true}
                                    withHorizontalLabels={true}
                                    withVerticalLabels={true}
                                    segments={4}
                                    yAxisLabel="RM"
                                    flatColor={true}
                                    withCustomBarColorFromData={true}
                                    chartConfig={{
                                        backgroundColor: "#abf1a3ff",
                                        backgroundGradientFrom: "#ffffff",
                                        backgroundGradientTo: "#ffffff",
                                        decimalPlaces: 0,
                                        color: () => "#6B7280",
                                        labelColor: () => "#6B7280",
                                        propsForBackgroundLines: {
                                            stroke: "#E5E7EB",
                                            strokeDasharray: "4", // dotted line
                                        },
                                        propsForLabels: {
                                            fontSize: 12,
                                        },
                                        barRadius: 6, // ⭐ Rounded bars
                                    }}
                                    style={styles.barStyle}
                                />

                                {/* Custom Category Legend */}
                                <View style={styles.barLegendContainer}>
                                    {barData.legend.map((cat, i) => (
                                        <View key={i} style={styles.barLegendItem}>
                                            <View
                                                style={[
                                                    styles.barLegendDot,
                                                    { backgroundColor: barData.datasets[i].color(1) },
                                                ]}
                                            />
                                            <Text style={styles.barLegendText}>
                                                {cat.length > 14 ? cat.slice(0, 14) + "..." : cat}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>


                            {/* Insights */}
                            {spendingInsights && (
                                <View style={styles.insightsContainer}>
                                    <Text style={styles.insightsTitle}>💡 Quick Insights</Text>

                                    {selectedCategory === "All" ? (
                                        <>
                                            <View style={styles.insightItem}>
                                                <Text style={styles.insightText} numberOfLines={2}>
                                                    Top category: <Text style={styles.highlightText}>{spendingInsights.topCategory.category}</Text>
                                                </Text>
                                            </View>
                                            {spendingInsights.trendInsight && (
                                                <View style={styles.insightItem}>
                                                    <Text style={styles.insightText} numberOfLines={2}>
                                                        {spendingInsights.trendInsight.type === 'absolute' ? (
                                                            <>
                                                                Spending {spendingInsights.trendInsight.isIncrease ? 'increased' : 'decreased'} by{' '}
                                                                <Text style={[styles.highlightText, {
                                                                    color: spendingInsights.trendInsight.isIncrease ? '#EF4444' : '#10B981'
                                                                }]}>
                                                                    RM{Math.abs(spendingInsights.trendInsight.absoluteChange).toFixed(0)}
                                                                </Text>
                                                            </>
                                                        ) : (
                                                            <>
                                                                Spending {spendingInsights.trendInsight.isIncrease ? 'increased' : 'decreased'} by{' '}
                                                                <Text style={[styles.highlightText, {
                                                                    color: spendingInsights.trendInsight.isIncrease ? '#EF4444' : '#10B981'
                                                                }]}>
                                                                    {Math.abs(spendingInsights.trendInsight.change).toFixed(0)}%
                                                                </Text>
                                                            </>
                                                        )}
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <View style={styles.insightItem}>
                                            <Text style={styles.insightText} numberOfLines={2}>
                                                <Text style={styles.highlightText}>{categoryInsights?.transactionCount} transactions</Text> • Avg: <Text style={styles.highlightText}>RM{categoryInsights?.averageTransaction.toFixed(2)}</Text>
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Legend */}
                            <View style={styles.legendContainer}>
                                {categoriesForLegend.slice(0, 5).map((category, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: categoryColors[category] }]} />
                                        <Text style={styles.legendText} numberOfLines={1}>
                                            {category.length > 10 ? category.substring(0, 10) + '...' : category}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <Text style={styles.noDataText}>No spending data available yet</Text>
                    )}
                </View>

                {/* Top Category Transactions */}
                {selectedCategory !== "All" && categoryInsights && categoryInsights.topTransactions.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Largest Expenses</Text>
                            <Text style={styles.cardSubtitle} numberOfLines={1}>Top {selectedCategory} spending</Text>
                        </View>

                        {categoryInsights.topTransactions.map((transaction, index) => (
                            <View key={index} style={styles.largeTransactionRow}>
                                <View style={styles.transactionLeft}>
                                    <Text style={styles.transactionName} numberOfLines={1}>
                                        {transaction.payee}
                                    </Text>
                                    <Text style={styles.transactionDate}>
                                        {new Date(transaction.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </Text>
                                </View>
                                <Text style={styles.largeTransactionAmount}>
                                    RM{transaction.amount.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recent Transactions */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            {selectedCategory === "All" ? "Recent Activity" : `Recent ${selectedCategory}`}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {selectedCategory === "All" ? "Latest transactions" : `Latest transactions`}
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
                    ) : recentTransactions.length > 0 ? (
                        recentTransactions.map((item, index) => (
                            <View key={index} style={styles.transactionRow}>
                                <View style={styles.transactionLeft}>
                                    <Text style={styles.transactionName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.transactionDate}>{item.date}</Text>
                                </View>
                                <Text style={[
                                    styles.transactionAmount,
                                    { color: item.type === "income" ? "#10B981" : "#EF4444" }
                                ]}>
                                    {item.amount}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>No recent transactions</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 40,
    },
    // Filter Section
    filterSection: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    filterGroup: {
        flex: 1,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4B5563",
        marginBottom: 8,
    },
    dropdownContainer: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
    dropdown: {
        height: 48,
        color: "#1F2937",
        fontSize: 14,
    },
    clearFilterButton: {
        backgroundColor: "#EF4444",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 12,
    },
    clearFilterText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Cards
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    cardSubtitle: {
        color: "#6B7280",
        fontSize: 13,
        fontWeight: '500',
    },
    loader: {
        marginVertical: 20,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 8,
    },
    barChart: {
        borderRadius: 12,
    },
    // Category Stats
    categoryStats: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    // Monthly Summary
    monthlySummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    monthSummaryItem: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 4,
    },
    monthLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
    },
    monthTotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    trendText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // Insights
    insightsContainer: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#0EA5E9',
    },
    insightsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0369A1',
        marginBottom: 6,
    },
    insightItem: {
        marginBottom: 4,
    },
    insightText: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
    highlightText: {
        fontWeight: '700',
        color: '#1F2937',
    },
    // Legend
    legendContainer: {
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 10,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: 100,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 4,
        flexShrink: 0,
    },
    legendText: {
        fontSize: 11,
        color: "#4B5563",
        fontWeight: '500',
        flexShrink: 1,
    },
    // Transactions
    transactionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    largeTransactionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    transactionLeft: {
        flex: 1,
        marginRight: 12,
    },
    transactionName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: "#6B7280",
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: "700",
        minWidth: 85,
        textAlign: 'right',
    },
    largeTransactionAmount: {
        fontSize: 15,
        fontWeight: "700",
        color: "#EF4444",
        minWidth: 85,
        textAlign: 'right',
    },
    noDataText: {
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 14,
        paddingVertical: 24,
        fontStyle: "italic",
    },
    enhancedPieContainer: {
        backgroundColor: "#ffffff",
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: "center",
        marginVertical: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },

    pieLegendContainer: {
        marginTop: 10,
        width: "90%",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 12,
    },

    pieLegendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },

    pieLegendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },

    pieLegendLabel: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
    },
    enhancedBarContainer: {
  marginTop: 10,
  backgroundColor: "#ffffff",
  borderRadius: 16,
  paddingVertical: 10,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
  alignItems: "center",
},

barStyle: {
  borderRadius: 12,
  marginTop: 8,
},

barLegendContainer: {
  width: "95%",
  marginTop: 14,
  borderTopWidth: 1,
  borderTopColor: "#F3F4F6",
  paddingTop: 14,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "center",
},

barLegendItem: {
  flexDirection: "row",
  alignItems: "center",
},

barLegendDot: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: 6,
},

barLegendText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#4B5563",
},


});