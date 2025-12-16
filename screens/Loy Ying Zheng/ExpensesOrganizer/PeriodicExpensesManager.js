import { Alert } from "react-native";
import { getPeriodicExpensesLocal, addExpenseLocal, getExpensesByTypeLabelLocal, updateExpenseLocal } from "../../../database/SQLite";



export const processPeriodicExpenses = async (userId) => {
  const expenses = await getPeriodicExpensesLocal(userId);
  const today = new Date();

  console.log("Trigger processPeriodicExpenses", expenses.length, "periodic items found");


  for (const exp of expenses) {
    if (!exp.isPeriodic) continue;

    let lastDate = new Date(exp.date);
    let nextDate = new Date(lastDate);

    // Check if type exists, if not assume Monthly
    const periodType = exp.type || "Monthly";

    if (periodType === "Monthly") nextDate.setMonth(lastDate.getMonth() + (exp.periodInterval || 1));
    else if (periodType === "Yearly") nextDate.setFullYear(lastDate.getFullYear() + (exp.periodInterval || 1));


    if (nextDate <= today) {
      // Check if we already have an entry for this exact date, payee, amount, and type
      // We need to check against all expenses of the same type, not just periodic ones
      const allExpensesOfType = await getExpensesByTypeLabelLocal(exp.userId, exp.typeLabel);
      const existing = allExpensesOfType.find(
        e => e.payee === exp.payee &&
             Math.abs(e.amount - exp.amount) < 0.01 && // Allow for small floating point differences
             e.date === nextDate.toISOString().split("T")[0] &&
             e.type === exp.type &&
             e.typeLabel === exp.typeLabel
      );
      if (!existing) {
        await addExpenseLocal(
          exp.userId,
          exp.payee,
          exp.amount,
          nextDate.toISOString().split("T")[0],
          exp.tag,
          exp.eventTag,
          exp.paymentType,
          exp.isPeriodic,
          exp.type,
          exp.typeLabel,
          exp.essentialityLabel,
          exp.goalId,
          exp.periodInterval
        );
        const itemType = exp.type === "income" ? "income" : "expense";
        Alert.alert("Periodic Item Generated", `Regular ${itemType} has been automatically generated: ${exp.payee}, Date: ${nextDate.toISOString().split("T")[0]}`);
        console.log(`✅ Auto-created new periodic ${itemType} for ${exp.payee}`);

        // Update the original periodic expense's date to the next date
        await updateExpenseLocal(
          exp.id,
          exp.userId,
          exp.payee,
          exp.amount,
          nextDate.toISOString().split("T")[0], // updated date
          exp.tag,
          exp.eventTag,
          exp.paymentType,
          exp.isPeriodic,
          exp.type,
          exp.typeLabel,
          exp.essentialityLabel,
          exp.goalId,
          exp.periodInterval
        );
        console.log(`✅ Updated original periodic expense date to ${nextDate.toISOString().split("T")[0]}`);
      }
    }
  }
};
