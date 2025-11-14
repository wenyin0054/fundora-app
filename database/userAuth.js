import { openDatabaseAsync } from "expo-sqlite";
import bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";
let db; // declare globally

bcrypt.setRandomFallback((len) => {
  const randomBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return randomBytes;
});
// ✅ Initialize database connection safely
export const connectUserDB = async () => {
  if (!db) {
    db = await openDatabaseAsync("userAuth.db");
  }
  return db;
};
// ------------------- RESET DATABASE (FOR TESTING) -------------------
export const resetUserDB = async () => {
  try {
    const db = await connectUserDB();
    console.log("🗑️ Dropping old users table...");

    // Drop the table if it exists
    await db.execAsync(`DROP TABLE IF EXISTS users;`);

    // Recreate with latest schema
    await initUserDB();

    console.log("✅ User table reset successfully");
  } catch (error) {
    console.error("❌ resetUserDB error:", error);
  }
};
// ------------------- DATABASE INITIALIZATION -------------------
export const initUserDB = async () => {
  try {
    const db = await connectUserDB();
    console.log("⚙️ Initializing User Authentication Database...");

    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT,
    monthlyIncome REAL,
    currency TEXT,
    resetToken TEXT,
    resetTokenExpiry INTEGER,
    updatedAt TEXT
  );
`);


    console.log("✅ User table initialized successfully");
  } catch (error) {
    console.error("❌ initUserDB error:", error);
  }
};

// ------------------- GENERATE USER ID -------------------
const generateUserId = async () => {
  const db = await connectUserDB();
  const rows = await db.getAllAsync(`SELECT userId FROM users ORDER BY id DESC LIMIT 1;`);

  if (rows.length === 0) return "U00001";

  const lastId = rows[0].userId;
  const num = parseInt(lastId.substring(1)) + 1;
  return "U" + num.toString().padStart(5, "0");
};


// ------------------- REGISTER USER -------------------
export const addUser = async (username, email, password) => {
  try {
    const db = await connectUserDB();

    if (!username || !email || !password) {
      throw new Error("Missing required fields");
    }

    const userId = await generateUserId();
    const salt = bcrypt.genSaltSync(8);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await db.runAsync(
      `INSERT INTO users (userId, username, email, password)
       VALUES (?, ?, ?, ?);`,
      [userId, username, email, hashedPassword]
    );

    console.log(`✅ User '${username}' registered successfully with ID: ${userId}`);
    return userId;
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      console.error("⚠️ Username or email already exists");
      throw new Error("Username or email already exists");
    } else {
      console.error("❌ registerUser error:", error);
      throw error;
    }
  }
};

// ------------------- LOGIN USER -------------------
export const loginUser = async (email, password) => {
  try {
    const db = await connectUserDB();
    const user = await db.getFirstAsync(`SELECT * FROM users WHERE email = ?;`, [email]);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  } catch (error) {
    console.error("⚠️ loginUser error:", error);
    return null;
  }
};

// ---------- Generate reset token ----------
export const generateResetToken = async (email) => {
  const db = await connectUserDB();
  const user = await db.getFirstAsync("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) throw new Error("User not found");

  // generate random token
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiry = Date.now() + 15 * 60 * 1000; // token valid for 15 min

  await db.runAsync(
    "UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE email = ?",
    [token, expiry, email]
  );

  console.log("✅ Reset token generated for:", email, token);
  return token;
};

// ---------- Verify token ----------
export const verifyResetToken = async (email, token) => {
  const db = await connectUserDB();
  const user = await db.getFirstAsync(
    "SELECT * FROM users WHERE email = ? AND resetToken = ?",
    [email, token]
  );
  if (!user) return false;
  if (Date.now() > user.resetTokenExpiry) return false;
  return true;
};

// ---------- Reset password ----------
export const resetPassword = async (email, token, newPassword) => {
  const db = await connectUserDB();

  const isValid = await verifyResetToken(email, token);
  if (!isValid) throw new Error("Invalid or expired token");

  const salt = bcrypt.genSaltSync(8);
  const hashed = bcrypt.hashSync(newPassword, salt);

  await db.runAsync(
    "UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE email = ?",
    [hashed, email]
  );

  console.log("✅ Password successfully reset for", email);
};

// ------------------- UPDATE USER PROFILE -------------------
export const updateUserProfile = async (userId, monthlyIncome, currency) => {
  try {
    const db = await connectUserDB();
    await db.runAsync(
      `UPDATE users
       SET monthlyIncome = ?, currency = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE userId = ?;`,
      [monthlyIncome, currency, userId]
    );
    console.log(`✅ User '${userId}' profile updated`);
  } catch (error) {
    console.error("❌ updateUserProfile error:", error);
  }
};

// ------------------- GET USER BY ID -------------------
export const getUserById = async (userId) => {
  try {
    const db = await connectUserDB();
    const result = await db.getFirstAsync(`SELECT * FROM users WHERE userId = ?;`, [userId]);
    return result || null;
  } catch (error) {
    console.error("❌ getUserById error:", error);
    return null;
  }
};

// ------------------- DELETE USER -------------------
export const deleteUser = async (userId) => {
  try {
    const db = await connectUserDB();
    await db.runAsync(`DELETE FROM users WHERE userId = ?;`, [userId]);
    console.log(`🗑️ User '${userId}' deleted`);
  } catch (error) {
    console.error("❌ deleteUser error:", error);
  }
};

export default connectUserDB;
