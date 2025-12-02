import { Alert } from "react-native";
import { getPeriodicBillsLocal, addExpenseLocal } from "../../../database/SQLite";



export const processPeriodicExpenses = async (userId) => {
  const expenses = await getPeriodicBillsLocal(userId);
  const today = new Date();

  console.log("Trigger processPeriodicExpenses");


  for (const exp of expenses) {
    if (!exp.isPeriodic) continue;

    let lastDate = new Date(exp.date);
    let nextDate = new Date(lastDate);

    if (exp.typeLabel === "Monthly") nextDate.setMonth(lastDate.getMonth() + (exp.periodInterval || 1));
    else if (exp.typeLabel === "Yearly") nextDate.setFullYear(lastDate.getFullYear() + (exp.periodInterval || 1));


    if (nextDate <= today) {
      const existing = expenses.find(
        e => e.payee === exp.payee && e.date === nextDate.toISOString().split("T")[0]
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
          exp.typeLabel,
          exp.essentialityLabel,
          exp.goalId,
          exp.periodInterval
        );
        Alert.alert("New Expenditure Generation", `Regular expenditures have been automatically generated: ${exp.payee}, Date: ${nextDate.toISOString().split("T")[0]}`);
        console.log(`✅ Auto-created new periodic expense for ${exp.payee}`);
      }
    }
  }
};
