import { openDatabaseSync } from 'expo-sqlite';
import { DeviceEventEmitter } from "react-native";

// ------------------- EXPENSES CRUD -------------------
const db = openDatabaseSync('fundora.db');


// ------------------- DATABASE INITIALIZATION -------------------
export const initDB = async () => {
  try {
    console.log("⚙️ Initializing Fundora database...");

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
        periodType TEXT,
        typeLabel TEXT,
        essentialityLabel INTEGER,
        synced INTEGER DEFAULT 0
      );
    `);

    // 🏦 Create Goals Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        goalName TEXT,
        targetAmount REAL,
        currentAmount REAL,
        deadline TEXT,
        synced INTEGER DEFAULT 0
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


   // 🧩 Ensure userId column exists
try {
  await db.execAsync(`ALTER TABLE activeEventTags ADD COLUMN userId TEXT;`);
  console.log("✅ Added userId column to activeEventTags");
} catch (e) {
  if (!e.message.includes("duplicate column")) {
    console.error("⚠️ Failed to alter activeEventTags:", e);
  }
}

    console.log("✅ All database tables (expenses, goals, tags) are ready");
  } catch (error) {
    console.error("❌ initDB error:", error);
  }
};

// 3️⃣ Add a new expense
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
  essentialityLabel
) => {
  try {
    await db.runAsync(
      `INSERT INTO expenses 
       (userId, payee, amount, date, tag, eventTag, paymentType, isPeriodic, periodType, typeLabel, essentialityLabel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        essentialityLabel
      ]
    );
    console.log("✅ Expense added successfully");
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
  essentialityLabel
) => {
  try {
    await db.runAsync(
      `UPDATE expenses
       SET payee = ?, amount = ?, date = ?, tag = ?, eventTag = ?, paymentType = ?, isPeriodic = ?, periodType = ?, typeLabel = ?, essentialityLabel = ?
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
        id
      ]
    );
    console.log(`✅ Expense with ID ${id} updated`);
  } catch (error) {
    console.error("❌ updateExpenseLocal error:", error);
  }
};

// ------------------- GOALS CRUD -------------------
export const createGoalTable = async () => {
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
