import { openDatabaseSync } from 'expo-sqlite';
import { DeviceEventEmitter } from "react-native";

const db = openDatabaseSync('fundora.db');

export const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });

// ------------------- DATABASE INITIALIZATION -------------------
export const initDB = async () => {
  try {
    console.log("⚙️ Initializing Fundora database...");

    // 🧾 Create User Summary Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_summary (
        userId TEXT PRIMARY KEY,
        total_income REAL DEFAULT 0,
        total_expense REAL DEFAULT 0,
        total_balance REAL DEFAULT 0
      );
`);
    // 🧾 Create Expenses Table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      payee TEXT,
      amount REAL,
      date TEXT,
      tag TEXT,
      eventTag TEXT,
      paymentType TEXT,
      isPeriodic INTEGER,
      periodInterval TEXT,       -- e.g. 'daily', 'weekly', 'monthly', 'yearly'
      nextOccurrence TEXT,        -- 下一次應該自動新增的日期
      type TEXT,
      typeLabel TEXT,
      essentialityLabel INTEGER,
      goalId INTEGER
    );
  `);


    // 🏦 Create Goals Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        goalName TEXT,
        description TEXT,
        targetAmount REAL,
        currentAmount REAL,
        deadline TEXT
      );
  `);

    // 🏷️ Create Tags Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        name TEXT UNIQUE,
        essentialityLabel INTEGER
      );
    `);

    // 🏷️ Create Event Tags Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS eventTags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        name TEXT UNIQUE,
        description TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS activeEventTags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        eventTagId INTEGER,
        startDate TEXT,
        endDate TEXT,
        FOREIGN KEY (eventTagId) REFERENCES eventTags(id)
      );
`);

    try {
      await db.execAsync(`ALTER TABLE goals ADD COLUMN description TEXT;`);
    } catch (error) {
      if (!error.message.includes("duplicate column")) {
        console.error("⚠️ Could not add description column:", error);
      }
    }


    console.log("✅ All database tables (expenses, goals, tags) are ready");
  } catch (error) {
    console.error("❌ initDB error:", error);
  }
};


// ------------------- USER SUMMARY TABLE -------------------

export const createUserSummary = async (userId) => {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_summary (userId, total_income, total_expense, total_balance)
     VALUES (?, 0, 0, 0)`,
    [userId]
  );
};

export const getUserSummary = async (userId) => {
  const result = await db.getFirstAsync(
    `SELECT total_income, total_expense, total_balance FROM user_summary WHERE userId = ?`,
    [userId]
  );
  return result || { total_income: 0, total_expense: 0, total_balance: 0 };
};

export const updateUserSummary = async (userId, type, amount) => {
  console.log("Updating user summary:", { userId, type, amount });

  if (type === "income") {
    await db.runAsync(
      `UPDATE user_summary 
       SET total_income = total_income + ?, 
           total_balance = total_balance + ? 
           
       WHERE userId = ?`,
      [amount, amount, userId]
    );

  } else if (type === "expense") {
    await db.runAsync(
      `UPDATE user_summary 
       SET total_expense = total_expense + ?, 
           total_balance = total_balance - ? 
       WHERE userId = ?`,
      [amount, amount, userId]
    );
  }

  const summary = await getUserSummary(userId);
  console.log("📊 Updated user summary:", summary);

};

export const resetUserSummary = async (userId) => {
  await db.runAsync(
    `UPDATE user_summary 
     SET total_income = 0, total_expense = 0, total_balance = 0 
     WHERE userId = ?`,
    [userId]
  );
};


export const updateUserSummaryOnAdd = async (userId, type, amount) => {
  try {
    const amountNum = parseFloat(amount);

    const summary = await getUserSummary(userId);
    const currentExpense = summary.total_expense || 0;
    const currentIncome = summary.total_income || 0;
    const currentBalance = summary.total_balance || 0;

    let newExpense = currentExpense;
    let newIncome = currentIncome;
    let newBalance = currentBalance;

    if (type === "expense") {
      newExpense = currentExpense + amountNum;
      newBalance = currentBalance - amountNum; // 支出减少余额
    } else if (type === "income") {
      newIncome = currentIncome + amountNum;
      newBalance = currentBalance + amountNum; // 收入增加余额
    }

    const results = await db.runAsync(
      `UPDATE user_summary SET total_expense = ?, total_income = ?, total_balance = ? WHERE userId = ?`,
      [newExpense, newIncome, newBalance, userId]
    );

    console.log(`✅ Summary updated - Expense: ${currentExpense}->${newExpense}, Income: ${currentIncome}->${newIncome}, Balance: ${currentBalance}->${newBalance}`);
    return results;
  } catch (error) {
    console.error(`❌ Error adding to summary:`, error);
    throw error;
  }
};

export const updateUserSummaryOnEdit = async (userId, type, oldAmount, newAmount) => {
  try {
    const oldAmountNum = parseFloat(oldAmount);
    const newAmountNum = parseFloat(newAmount);
    const diff = newAmountNum - oldAmountNum;

    const summary = await getUserSummary(userId);
    const currentExpense = summary.total_expense || 0;
    const currentIncome = summary.total_income || 0;
    const currentBalance = summary.total_balance || 0;

    let newExpense = currentExpense;
    let newIncome = currentIncome;
    let newBalance = currentBalance;

    if (type === "expense") {
      newExpense = currentExpense + diff;
      newBalance = currentBalance - diff; // 支出变化反向影响余额
    } else if (type === "income") {
      newIncome = currentIncome + diff;
      newBalance = currentBalance + diff; // 收入变化正向影响余额
    }

    const results = await db.runAsync(
      `UPDATE user_summary SET total_expense = ?, total_income = ?, total_balance = ? WHERE userId = ?`,
      [newExpense, newIncome, newBalance, userId]
    );

    console.log(`✅ Summary edited - Expense: ${currentExpense}->${newExpense}, Income: ${currentIncome}->${newIncome}, Balance: ${currentBalance}->${newBalance}`);
    return results;
  } catch (error) {
    console.error(`❌ Error editing summary:`, error);
    throw error;
  }
};

export const updateUserSummaryOnDelete = async (userId, type, amount) => {
  try {
    const amountNum = parseFloat(amount);

    const summary = await getUserSummary(userId);
    const currentExpense = summary.total_expense || 0;
    const currentIncome = summary.total_income || 0;
    const currentBalance = summary.total_balance || 0;

    let newExpense = currentExpense;
    let newIncome = currentIncome;
    let newBalance = currentBalance;

    if (type === "expense") {
      newExpense = currentExpense - amountNum;
      newBalance = currentBalance + amountNum; // 删除支出增加余额
    } else if (type === "income") {
      newIncome = currentIncome - amountNum;
      newBalance = currentBalance - amountNum; // 删除收入减少余额
    }

    const results = await db.runAsync(
      `UPDATE user_summary SET total_expense = ?, total_income = ?, total_balance = ? WHERE userId = ?`,
      [newExpense, newIncome, newBalance, userId]
    );

    console.log(`✅ Summary deleted - Expense: ${currentExpense}->${newExpense}, Income: ${currentIncome}->${newIncome}, Balance: ${currentBalance}->${newBalance}`);
    return results;
  } catch (error) {
    console.error(`❌ Error deleting from summary:`, error);
    throw error;
  }
};

// -------------------- EXPENSES CRUD -------------------
export const addExpenseLocal = async (
  userId,
  payee,
  amount,
  date,
  tag,
  eventTag,
  paymentType,
  isPeriodic,
  periodType,
  typeLabel,
  essentialityLabel,
  goalId = null   // ✅ new
) => {
  try {
    await db.runAsync(
      `INSERT INTO expenses 
     (userId, payee, amount, date, tag, eventTag, paymentType, isPeriodic, periodType, typeLabel, essentialityLabel, goalId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        userId,
        payee,
        amount,
        date,
        tag,
        eventTag,
        paymentType,
        isPeriodic ? 1 : 0,
        periodType,
        typeLabel,
        essentialityLabel,
        goalId
      ]
    );
    console.log("✅ Expense added successfully", typeLabel);
    console.log("Added Detail", userId, payee, amount, date, tag, eventTag, paymentType, isPeriodic, periodType, typeLabel, essentialityLabel, goalId);
  } catch (error) {
    console.error("❌ addExpenseLocal error:", error);
  }

};


// 4️⃣ Get all expenses
export const getExpensesLocal = async () => {
  try {
    const results = await db.getAllAsync(`SELECT * FROM expenses ORDER BY date DESC;`);
    const normalized = results.map(item => ({
      ...item,
      amount: parseFloat(item.amount) || 0,
      essentialityLabel: Number(item.essentialityLabel),
      isPeriodic: Number(item.isPeriodic),
    }));
    return normalized;
  } catch (error) {
    console.error("❌ getExpensesLocal error:", error);
    return [];
  }
};

// 5️⃣ Delete expense by ID
export const deleteExpenseLocal = async (id) => {
  try {
    await db.runAsync(`DELETE FROM expenses WHERE id = ?;`, [id]);
    console.log(`🗑️ Expense with ID ${id} deleted`);
  } catch (error) {
    console.error("❌ deleteExpenseLocal error:", error);
  }
};

// 6️⃣ Update expense
export const updateExpenseLocal = async (
  id,
  payee,
  amount,
  date,
  tag,
  eventTag,
  paymentType,
  isPeriodic,
  periodType,
  typeLabel,
  essentialityLabel,
  goalId
) => {
  try {
    await db.runAsync(
      `UPDATE expenses
       SET payee = ?, amount = ?, date = ?, tag = ?, eventTag = ?, paymentType = ?, isPeriodic = ?, periodType = ?, typeLabel = ?, essentialityLabel = ?, goalId = ?
       WHERE id = ?;`,
      [
        payee,
        amount,
        date,
        tag,
        eventTag,
        paymentType,
        isPeriodic ? 1 : 0,
        periodType,
        typeLabel,
        essentialityLabel,
        goalId,
        id
      ]
    );
    console.log(`✅ Expense with ID ${id} updated`);
  } catch (error) {
    console.error("❌ updateExpenseLocal error:", error);
  }
};

// export const getExpensesByTypeLabelLocal = async (typeLabel) => {
//   try {

//     if (!db || !db.getAllAsync) {
//       throw new Error("❌ DB is not initialized or missing getAllAsync method");
//     }

//     const results = await db.getAllAsync(`
//       SELECT
//         SUM(amount) AS total,
//         SUM(CASE WHEN essentialityLabel = 1 THEN amount ELSE 0 END) AS essentialTotal
//       FROM expenses
//       WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month');
//     `);

//     const row = results?.[0] || {};
//     const total = parseFloat(row.total) || 0;
//     const essentialTotal = parseFloat(row.essentialTotal) || 0;

//     console.log("✅ Last month expenses:", { total, essentialTotal });
//     return { total, essentialTotal };
//   } catch (error) {
//     console.error("❌ getLastMonthTotalExpense error:", error);
//     return { total: 0, essentialTotal: 0 };
//   }
// };

// 🧮 Get total and essential total for a specific type
export const getExpensesByTypeLabelLocal = async (typeLabel) => {
  try {
    if (!db || !db.getAllAsync) {
      throw new Error("❌ DB is not initialized or missing getAllAsync method");
    }

    const allowedTypes = ["income", "expenses", "transaction"];
    if (!allowedTypes.includes(typeLabel)) {
      throw new Error(`❌ Invalid typeLabel: ${typeLabel}`);
    }
    console.log(await getExpensesLocal());

    const results = await db.getAllAsync(`
      SELECT *
      FROM expenses
      WHERE typeLabel = '${typeLabel}'
      ORDER BY date DESC
    `);

    console.log(`✅ Fetched ${results.length} rows for typeLabel: ${typeLabel}`);
    return results; // 回傳所有符合的資料
  } catch (error) {
    console.error("❌ getExpensesByTypeLabelLocal error:", error);
    return [];
  }
};


export const clearAllExpensesLocal = async () => {
  try {
    await db.runAsync(`DELETE FROM expenses;`);
    console.log("🗑️ All expenses cleared successfully");
  } catch (error) {
    console.error("❌ clearAllExpensesLocal error:", error);
  }
};

// 🧮 Get total and essential total expenses for last month
export const getLastMonthTotalExpense = async () => {
  try {
    const results = await db.getAllAsync(`
      SELECT
        SUM(amount) AS total,
        SUM(CASE WHEN essentialityLabel = 1 THEN amount ELSE 0 END) AS essentialTotal
      FROM expenses
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', '-1 month');
    `);

    const row = results?.[0] || {};
    const total = parseFloat(row.total) || 0;
    const essentialTotal = parseFloat(row.essentialTotal) || 0;

    console.log("✅ Last month expenses:", { total, essentialTotal });
    return { total, essentialTotal };
  } catch (error) {
    console.error("❌ getLastMonthTotalExpense error:", error);
    return { total: 0, essentialTotal: 0 };
  }
};
// ------------------- GOALS CRUD -------------------
export const createGoalTable = async () => {
  await db.execAsync(`
    DROP TABLE IF EXISTS goals;
  `);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      goalName TEXT,
      description TEXT,
      targetAmount REAL,
      currentAmount REAL,
      deadline TEXT
    );
  `);
};


export const addGoalLocal = async (userId, goalName, description, targetAmount, currentAmount, deadline) => {
  await db.runAsync(
    `INSERT INTO goals (userId, goalName, description, targetAmount, currentAmount, deadline)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [userId, goalName, description, targetAmount, currentAmount, deadline]
  );
};

export const getGoalsLocal = async () => {
  return await db.getAllAsync(`SELECT * FROM goals ORDER BY deadline ASC;`);
};

export const updateGoalLocal = async (id, goalName, description, targetAmount, currentAmount, deadline) => {
  try {
    await db.runAsync(
      `UPDATE goals
       SET goalName = ?, description = ?, targetAmount = ?, currentAmount = ?, deadline = ?
       WHERE id = ?;`,
      [goalName, description, targetAmount, currentAmount, deadline, id]
    );
    console.log(`✅ Goal ID ${id} updated`);
  } catch (error) {
    console.error("❌ updateGoalLocal error:", error);
  }
};

export const deleteGoalLocal = async (id) => {
  try {
    await db.runAsync(`DELETE FROM goals WHERE id = ?;`, [id]);
    console.log(`🗑️ Goal ID ${id} deleted`);
  } catch (error) {
    console.error("❌ deleteGoalLocal error:", error);
  }
};

// Update currentAmount of a goal by adding amount
export const updateGoalAmount = async (goalId, amount) => {
  try {
    await db.runAsync(
      `UPDATE goals 
       SET currentAmount = currentAmount + ? 
       WHERE id = ?`,
      [amount, goalId]
    );
    console.log(`✅ Goal ${goalId} updated by ${amount}`);
  } catch (error) {
    console.error("❌ Error updating goal amount:", error);
  }
};


// ------------------- TAGS  CRUD -------------------
export const createTagTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      name TEXT UNIQUE,
      essentialityLabel INTEGER
    );
  `);
};

export const addTagLocal = async (userId, name, essentialityLabel) => {
  await db.runAsync(
    `INSERT INTO tags (userId, name, essentialityLabel)
     VALUES (?, ?, ?);`,
    [userId, name, essentialityLabel]
  );
};

export const getTagsLocal = async () => {
  return await db.getAllAsync(`SELECT * FROM tags ORDER BY name ASC;`);
};

export const deleteTagLocal = async (id) => {
  try {
    await db.runAsync(`DELETE FROM tags WHERE id = ?;`, [id]);
    console.log(`🗑️ Tag ID ${id} deleted`);
  } catch (error) {
    console.error("❌ deleteTagLocal error:", error);
  }
};

// ------------------- EVENT TAGS CRUD -------------------
export const createEventTagTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS eventTags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      name TEXT UNIQUE,
      description TEXT
    );
  `);
  console.log("✅ eventTags table ready");
};

export const addEventTagLocal = async (userId, name, description = null) => {
  try {
    await db.runAsync(
      `INSERT INTO eventTags (userId, name, description)
       VALUES (?, ?, ?);`,
      [userId, name, description]
    );
    console.log(`✅ Event tag '${name}' added`);
    DeviceEventEmitter.emit("eventTagsUpdated");
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      console.warn(`⚠️ Event tag '${name}' already exists`);
    } else {
      console.error("❌ addEventTagLocal error:", error);
    }
  }
};

export const getEventTagsLocal = async () => {
  try {
    const results = await db.getAllAsync(`SELECT * FROM eventTags ORDER BY name ASC;`);
    console.log(`✅ Retrieved ${results.length} event tags`);
    return results;
  } catch (error) {
    console.error("❌ getEventTagsLocal error:", error);
    return [];
  }
};

export const updateEventTagLocal = async (id, newName, newDescription) => {
  try {
    await db.runAsync(
      `UPDATE eventTags
       SET name = ?, description = ?
       WHERE id = ?;`,
      [newName, newDescription, id]
    );
    console.log(`✅ Event tag ID ${id} updated`);
    DeviceEventEmitter.emit("eventTagsUpdated");
  } catch (error) {
    console.error("❌ updateEventTagLocal error:", error);
  }
};

export const deleteEventTagLocal = async (id) => {
  try {
    await db.runAsync(`DELETE FROM eventTags WHERE id = ?;`, [id]);
    console.log(`🗑️ Event tag ID ${id} deleted`);
    DeviceEventEmitter.emit("eventTagsUpdated");
  } catch (error) {
    console.error("❌ deleteEventTagLocal error:", error);
  }
};

// ------------------- ACTIVE EVENT TAGS CRUD -------------------
export const addActiveEventTagLocal = async (userId, eventTagId, startDate, endDate) => {
  try {
    await db.runAsync(
      `INSERT INTO activeEventTags (userId, eventTagId, startDate, endDate) VALUES (?, ?, ?, ?);`,
      [userId, eventTagId, startDate, endDate]
    );
    console.log(`✅ Active event tag added`);
  } catch (error) {
    console.error("❌ addActiveEventTagLocal error:", error);
  }
};

export const getActiveEventTagsLocal = async (userId) => {
  try {
    const results = await db.getAllAsync(
      `SELECT aet.id, aet.startDate, aet.endDate, et.name 
       FROM activeEventTags aet
       JOIN eventTags et ON aet.eventTagId = et.id
       WHERE aet.userId = ?
       ORDER BY aet.startDate DESC;`,
      [userId]
    );
    return results;
  } catch (error) {
    console.error("❌ getActiveEventTagsLocal error:", error);
    return [];
  }
};

export const deleteActiveEventTagLocal = async (id) => {
  try {
    await db.runAsync(`DELETE FROM activeEventTags WHERE id = ?;`, [id]);
    console.log(`🗑️ Active event tag ID ${id} deleted`);
  } catch (error) {
    console.error("❌ deleteActiveEventTagLocal error:", error);
  }
};

export const clearAllActiveEventTagsLocal = async (userId) => {
  try {
    await db.runAsync(
      `DELETE FROM activeEventTags WHERE userId = ?;`,
      [userId]
    );
    console.log(`🗑️ All active event tags for user ${userId} cleared`);
  } catch (error) {
    console.error("❌ clearAllActiveEventTagsLocal error:", error);
  }
};

