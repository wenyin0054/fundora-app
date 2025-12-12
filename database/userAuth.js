import { openDatabaseAsync } from "expo-sqlite";
import bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";
import quizData from "../assets/financial_quiz.json";

let db = null;
let isConnecting = false;
let connectionPromise = null;

export const connectUserDB = async () => {
  // If already connected, return the connection
  if (db) {
    return db;
  }

  // If connection is in progress, wait for it
  if (isConnecting) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      console.log("🔄 Establishing database connection...");
      db = await openDatabaseAsync("userAuth.db");

      // Test the connection
      await db.execAsync('SELECT 1');

      console.log("✅ Database connected successfully");
      isConnecting = false;
      resolve(db);
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      db = null;
      isConnecting = false;
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
};

// Add a function to check connection health
export const checkDatabaseConnection = async () => {
  try {
    const database = await connectUserDB();
    await database.execAsync('SELECT 1');
    return true;
  } catch (error) {
    console.error("❌ Database connection check failed:", error);
    // Reset connection to allow reconnection
    db = null;
    connectionPromise = null;
    isConnecting = false;
    return false;
  }
};
bcrypt.setRandomFallback((len) => {
  const randomBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return randomBytes;
});

// ✅ Initialize database connection safely

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
        age INTEGER,
        levelOfExperience TEXT,
        goals TEXT,
        onboardingCompleted Boolean DEFAULT 0,
        budgetingCategory TEXT,
        dailyQuiz INTEGER DEFAULT 1,
        occupation TEXT,
        profileImage TEXT, 
        resetToken TEXT,
        resetTokenExpiry INTEGER,
        updatedAt TEXT
      );
    `);

    // Add face data table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS face_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        face_embedding TEXT ,
        face_image BLOB,
        pose_type TEXT ,
        faceResgiteredCompleted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    date TEXT,
    question TEXT,
    selectedOption INTEGER,
    correctAnswer INTEGER,
    isCorrect INTEGER,
    points INTEGER
  );
`);

    await db.execAsync(`
CREATE TABLE IF NOT EXISTS password_reset_requests (
  email TEXT,
  otp TEXT,
  expiresAt INTEGER
);

`);

    console.log("✅ User, Face, and Quiz tables initialized successfully");

    // Insert quiz data after creating tables

  } catch (error) {
    console.error("❌ initUserDB error:", error);
  }
};

// ------------------- QUIZ DATA MANAGEMENT -------------------

export const insertQuizResult = async (quizResult) => {
  const db = await connectUserDB();
  const { userId, question, selectedOption, correctAnswer, isCorrect, points, date } = quizResult;
  await db.runAsync(
    `INSERT INTO quiz_results (userId, date, question, selectedOption, correctAnswer, isCorrect, points)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, date, question, selectedOption, correctAnswer, isCorrect, points]
  );
  console.log("✅ Quiz result saved for user:", userId);
};

export const getTodayQuizStatus = async (userId) => {
  const db = await connectUserDB();
  const today = new Date().toISOString().split("T")[0];
  const result = await db.getFirstAsync(
    `SELECT * FROM quiz_results WHERE userId = ? AND date = ?`,
    [userId, today]
  );
  return !!result;
};




/** ✅ Get a random quiz by user level */
export const getQuizByLevel = (level) => {
  try {
    console.log("📊 Loading quiz for level:", level);
    console.log("📁 Quiz data type:", Array.isArray(quizData) ? 'Array' : typeof quizData);

    // Check if quizData is an array (your current structure)
    if (!Array.isArray(quizData)) {
      console.error("❌ quizData is not an array");
      return null;
    }

    // Normalize level name
    const normalizedLevel = level?.toLowerCase() || 'beginner';
    console.log("🔍 Filtering for level:", normalizedLevel);

    // Filter quizzes by level
    const levelQuizzes = quizData.filter(quiz =>
      quiz.level?.toLowerCase() === normalizedLevel
    );

    console.log(`📋 Found ${levelQuizzes.length} quizzes for level: ${normalizedLevel}`);

    if (!levelQuizzes || levelQuizzes.length === 0) {
      console.error(`❌ No quizzes found for level: ${normalizedLevel}`);

      // Fallback to beginner level
      const fallbackQuizzes = quizData.filter(quiz =>
        quiz.level?.toLowerCase() === 'beginner'
      );

      if (fallbackQuizzes && fallbackQuizzes.length > 0) {
        console.log("🔄 Falling back to beginner level quizzes");
        const randomIndex = Math.floor(Math.random() * fallbackQuizzes.length);
        const selectedQuiz = fallbackQuizzes[randomIndex];
        return transformQuizFormat(selectedQuiz);
      }
      return null;
    }

    // Get a random quiz from the level
    const randomIndex = Math.floor(Math.random() * levelQuizzes.length);
    const selectedQuiz = levelQuizzes[randomIndex];

    console.log("✅ Successfully loaded quiz:", selectedQuiz?.question?.substring(0, 50) + "...");
    return transformQuizFormat(selectedQuiz);
  } catch (error) {
    console.error("❌ Error getting quiz by level:", error);
    return null;
  }
};

// Helper function to transform quiz format
const transformQuizFormat = (quiz) => {
  if (!quiz) return null;

  return {
    question: quiz.question,
    options: quiz.options,
    correct_answer: quiz.correct_answer_index + 1, // Convert from 0-based to 1-based
    explanation: quiz.explanation,
    category: quiz.category
  };
};
// ------------------- USER AUTHENTICATION FUNCTIONS -------------------
// Add this function to handle database errors
const recoverFromDatabaseError = async () => {
  try {
    console.log("🔄 Attempting database recovery...");

    // Simple recovery - just wait and retry
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test by checking face registration status
    if (loggedInUserId) {
      const hasFace = await hasRegisteredFace(loggedInUserId);
      console.log("✅ Database recovery check:", hasFace ? 'Success' : 'No face data');
      return true;
    }
    return true;
  } catch (error) {
    console.error("❌ Database recovery failed:", error);
    return false;
  }
};



export const logUserTable = async () => {
  try {
    const db = await connectUserDB();
    console.log("📋 Checking users table structure and data...");

    // 1️⃣ Get table info (column names, types)
    const columns = await db.getAllAsync("PRAGMA table_info(users);");
    console.log("🧩 Table Columns:");
    columns.forEach((col) =>
      console.log(`- ${col.name} (${col.type})`)
    );

    // 2️⃣ Get all data in the table
    const rows = await db.getAllAsync("SELECT * FROM users;");
    console.log("📊 Table Data:", rows);

  } catch (error) {
    console.error("❌ Error fetching user table info:", error);
  }
};

// ------------------- RESET DATABASE (FOR TESTING) -------------------
export const resetUserDB = async () => {
  try {
    const db = await connectUserDB();
    console.log("🗑️ Dropping old users table...");

    // Drop the table if it exists
    await db.execAsync(`DROP TABLE IF EXISTS users;`);
    await db.execAsync(`DROP TABLE IF EXISTS face_data;`);
    await db.execAsync(`DROP TABLE IF EXISTS quizzes;`);

    // Recreate with latest schema
    await initUserDB();

    console.log("✅ User table reset successfully");
  } catch (error) {
    console.error("❌ resetUserDB error:", error);
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
    const users = await db.getAllAsync(
      `SELECT * FROM users WHERE email = ?;`,
      [email]
    );

    const user = users?.length > 0 ? users[0] : null;
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    // Ensure userId exists (backward compatibility)
    if (!user.userId) {
      const generatedId = `user_${Date.now()}`;

      await db.runAsync(
        `UPDATE users SET userId = ? WHERE id = ?;`,
        [generatedId, user.id]
      );

      user.userId = generatedId;
    }

    // Always return a clean object
    return {
      id: user.id,
      userId: user.userId,
      username: user.username,
      email: user.email,
      monthlyIncome: user.monthlyIncome,
      dailyQuiz: user.dailyQuiz,
      onboardingCompleted: user.onboardingCompleted,
      occupation: user.occupation,
    };

  } catch (error) {
    console.error("⚠️ loginUser error:", error);
    return null;
  }
};


// ---------- Generate reset token ----------
export const generateResetToken = async (email) => {
  try {
    const db = await connectUserDB();
    const users = await db.getAllAsync("SELECT * FROM users WHERE email = ?", [email]);
    const user = users && users.length > 0 ? users[0] : null;

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
  } catch (error) {
    console.error("❌ generateResetToken error:", error);
    throw error;
  }
};

// ---------- Verify token ----------
export const verifyResetToken = async (email, token) => {
  try {
    const db = await connectUserDB();
    const users = await db.getAllAsync(
      "SELECT * FROM users WHERE email = ? AND resetToken = ?",
      [email, token]
    );
    const user = users && users.length > 0 ? users[0] : null;

    if (!user) return false;
    if (Date.now() > user.resetTokenExpiry) return false;
    return true;
  } catch (error) {
    console.error("❌ verifyResetToken error:", error);
    return false;
  }
};

// ---------- Reset password ----------
export const resetPassword = async (email, token, newPassword) => {
  try {
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
  } catch (error) {
    console.error("❌ resetPassword error:", error);
    throw error;
  }
};

// ------------------- GET USER BY ID -------------------
export const getExperienceLevel = async (userId) => {
  try {
    console.log(`🔍 Getting experience level for user ID: ${userId}`);

    const db = await connectUserDB();

    if (!db) {
      console.error("❌ Database connection failed");
      return null;
    }

    const result = await db.getAllAsync(
      `SELECT levelOfExperience FROM users WHERE userId = ?;`,
      [userId]
    );

    console.log(`✅ Experience level query executed successfully, found ${result.length} records`);

    if (result && result.length > 0) {
      console.log(`📊 User ${userId} experience level: ${result[0].levelOfExperience}`);
      return result[0].levelOfExperience;
    } else {
      console.log("userId", userId);

      console.log(`❌ No user found with ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("❌ getExperienceLevel error:", error);
    console.error("Error details:", error.message);
    return null;
  }
};

// ------------------- UPDATE USER EXPERIENCE LEVEL -------------------
export const updateUserExperienceLevel = async (userId, levelOfExperience) => {
  try {
    const db = await connectUserDB();
    await db.runAsync(
      `UPDATE users 
       SET levelOfExperience = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE userId = ?;`,
      [levelOfExperience, userId]
    );
    console.log(`✅ Experience level saved for user ${userId}: ${levelOfExperience}`);
    return true;
  } catch (error) {
    console.error("❌ updateUserExperienceLevel error:", error);
    throw error;
  }
};

// ------------------- UPDATE USER PROFILE -------------------
export const updateUserProfile = async (userId, username, age, monthlyIncome, goals, occupation, budgetCategory, dailyQuiz, profileImage = null) => {
  try {
    const db = await connectUserDB();

    console.log("🔄 Updating profile for user:", userId);
    console.log("📝 Data:", { username, age, monthlyIncome, goals, occupation, dailyQuiz, profileImage });

    const result = await db.runAsync(
      `UPDATE users 
       SET
         username = ?,
         age = ?,
         monthlyIncome = ?,
         goals = ?,
         occupation = ?,
         budgetingCategory = ?,
         dailyQuiz = ?,
         profileImage = ?,
         updatedAt = datetime('now')
       WHERE userId = ?;`,
      [
        username || '',
        age ? parseInt(age) : null,
        monthlyIncome ? parseFloat(monthlyIncome) : null,
        goals || '',
        occupation || '',
        budgetCategory || '',
        dailyQuiz ? 1 : 0,
        profileImage,
        userId
      ]
    );

    console.log(`✅ User '${userId}' profile updated successfully`);
    return true;
  } catch (error) {
    console.error("❌ updateUserProfile error:", error);
    throw error;
  }
};

export const getUserProfileImage = async (userId) => {
  try {
    const db = await connectUserDB();

    const result = await db.getAllAsync(
      `SELECT profileImage FROM users WHERE userId = ?;`,
      [userId]
    );

    if (result && result.length > 0) {
      const profileImage = result[0].profileImage;
      console.log(`✅ Retrieved profile image for user ${userId}:`, profileImage ? 'Has image' : 'No image');
      return profileImage;
    }

    return null;
  } catch (error) {
    console.error("❌ getUserProfileImage error:", error);
    return null;
  }
};

export const deleteUserProfileImage = async (userId) => {
  try {
    const db = await connectUserDB();

    await db.runAsync(
      `UPDATE users SET profileImage = NULL, updatedAt = datetime('now') WHERE userId = ?;`,
      [userId]
    );

    console.log(`🗑️ Profile image deleted for user ${userId}`);
    return true;
  } catch (error) {
    console.error("❌ deleteUserProfileImage error:", error);
    throw error;
  }
};

// ------------------- GET USER BY ID -------------------
export const getUserById = async (userId) => {
  try {
    console.log(`🔍 Getting user by ID: ${userId}`);

    const db = await connectUserDB();

    if (!db) {
      console.error("❌ Database connection failed");
      return null;
    }

    const result = await db.getAllAsync(`SELECT * FROM users WHERE userId = ?;`, [userId]);

    console.log(`✅ Query executed successfully, found ${result.length} users`);

    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("❌ getUserById error:", error);
    console.error("Error details:", error.message);
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

export const completeOnboarding = async (userId) => {
  try {
    const db = await connectUserDB();
    await db.runAsync(
      `UPDATE users SET onboardingCompleted = 1 WHERE userId = ?;`,
      [userId]
    );
    console.log('✅ Onboarding marked as completed');
  } catch (error) {
    console.error('❌ Error updating onboardingCompleted:', error);
  }
};

export const checkOnboardingStatus = async (userId) => {
  try {
    const db = await connectUserDB();
    const result = await db.getAllAsync(
      `SELECT onboardingCompleted FROM users WHERE userId = ?;`,
      [userId]
    );

    if (result && result.length > 0 && result[0].onboardingCompleted === 1) {
      console.log('🟢 Onboarding already completed');
      return true;
    } else {
      console.log('🟠 Onboarding not completed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    return false;
  }
};

export const updateUserOnboardingInfo = async (userId, ageRange, incomeRange, occupation) => {
  try {
    console.log(`💾 Updating onboarding info for user: ${userId}`);

    const userExists = await getUserById(userId);
    if (!userExists) {
      console.error(`❌ User with ID ${userId} not found`);
      throw new Error("User not found");
    }

    const db = await connectUserDB();

    if (!db) {
      throw new Error("Database connection failed");
    }

    const result = await db.runAsync(
      `UPDATE users SET age = ?, monthlyIncome = ?, occupation = ?, onboardingCompleted = ? WHERE userId = ?`,
      [ageRange, incomeRange, occupation, true, userId]
    );

    console.log(`✅ Onboarding info updated successfully for user: ${userId}`);
    console.log(`Update result:`, result);

    return result;
  } catch (error) {
    console.error("❌ updateUserOnboardingInfo error:", error);
    throw error;
  }
};

// ------------------- FACE DATA MANAGEMENT -------------------

// Store face data for a user
export const storeFaceData = async (userId, faceEmbedding, faceImage, poseType) => {
  try {
    const db = await connectUserDB();

    await db.runAsync(
      `INSERT INTO face_data (userId, face_embedding, face_image, pose_type) 
       VALUES (?, ?, ?, ?);`,
      [userId, faceEmbedding, faceImage, poseType]
    );

    console.log(`✅ Face data stored for user ${userId}, pose: ${poseType}`);
    return true;
  } catch (error) {
    console.error("❌ storeFaceData error:", error);
    throw error;
  }
};

// Get all face data for a user
export const getUserFaceData = async (userId) => {
  try {
    const db = await connectUserDB();
    const faces = await db.getAllAsync(
      `SELECT * FROM face_data WHERE userId = ? AND is_active = 1 ORDER BY pose_type;`,
      [userId]
    );
    return faces;
  } catch (error) {
    console.error("❌ getUserFaceData error:", error);
    return [];
  }
};

// Check if user has registered face
export const hasRegisteredFace = async (userId) => {
  try {
    const db = await connectUserDB();
    const results = await db.getAllAsync(
      `SELECT COUNT(*) as count FROM face_data WHERE userId = ? AND is_active = 1;`,
      [userId]
    );
    return results && results.length > 0 ? results[0].count > 0 : false;
  } catch (error) {
    console.error("❌ hasRegisteredFace error:", error);
    return false;
  }
};

// Delete user's face data
export const deleteUserFaceData = async (userId) => {
  try {
    const db = await connectUserDB();
    await db.runAsync(
      `UPDATE face_data SET is_active = 0 WHERE userId = ?;`,
      [userId]
    );
    console.log(`🗑️ Face data deleted for user ${userId}`);
    return true;
  } catch (error) {
    console.error("❌ deleteUserFaceData error:", error);
    throw error;
  }
};

// Get user by email (useful for face registration flow)
export const getUserByEmail = async (email) => {
  try {
    const db = await connectUserDB();
    const users = await db.getAllAsync(`SELECT * FROM users WHERE email = ?;`, [email]);
    return users && users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("❌ getUserByEmail error:", error);
    return null;
  }
};
// Close database connection (useful for cleanup)
export const closeUserDB = async () => {
  if (db) {
    try {
      await db.closeAsync();
      console.log("✅ Database connection closed");
    } catch (error) {
      console.error("❌ Error closing database:", error);
    } finally {
      db = null;
      connectionPromise = null;
      isConnecting = false;
    }
  }
};
export default connectUserDB;

function generate6DigitOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtpForUser(email) {
  const otp = generate6DigitOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟有效

  await db.execAsync(`DELETE FROM password_reset_requests WHERE email = ?`, [email]);
  await db.execAsync(
    `INSERT INTO password_reset_requests (email, otp, expiresAt) VALUES (?, ?, ?)`,
    [email, otp, expiresAt]
  );

  return otp;
}