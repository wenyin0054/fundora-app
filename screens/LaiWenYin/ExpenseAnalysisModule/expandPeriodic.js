/* -------------------------
   Periodic expansion (proration)
   - expands periodic entries into monthly chunks
   ------------------------- */


export const expandPeriodicExpenses = (expenses) => {
    const expanded = [];

    expenses.forEach(exp => {
        if (exp.isPeriodic === 1) {
            let spreadMonths = 1;

            if (exp.type === "Monthly") spreadMonths = exp.periodInterval || 1;
            else if (exp.type === "Yearly") spreadMonths = (exp.periodInterval || 1) * 12;
            else if (exp.type === "Quarterly") spreadMonths = (exp.periodInterval || 1) * 3;
            else if (exp.type === "6 months") spreadMonths = 6;
            else spreadMonths = exp.periodInterval || 1; // default to monthly periods

            const monthlyAmount = exp.amount / spreadMonths;

            for (let i = 0; i < spreadMonths; i++) {
                const newDate = new Date(exp.date);
                newDate.setMonth(newDate.getMonth() + i);

                expanded.push({
                    ...exp,
                    amount: monthlyAmount,
                    date: newDate.toISOString().split("T")[0],
                    isExpanded: true,
                    originalId: exp.id ?? null,
                });
            }
        } else {
            expanded.push(exp);
        }
    });

    return expanded;
};
