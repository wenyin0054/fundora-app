# face_registration_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import io
from PIL import Image
import json
import os
import torch
import torch.nn.functional as F
from facenet_pytorch import MTCNN, InceptionResnetV1
import sqlite3
from datetime import datetime
import random
import time
import resend
resend.api_key = "re_bdewNEuz_5Ymy5iX1qnfg81MZ8kbH6R64"   # 放你的 resend API Key



app = Flask(__name__)
CORS(app)

# Initialize with your trained model setup
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device, post_process=False)
facenet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

def init_database():
    """Initialize SQLite database for face embeddings"""
    conn = sqlite3.connect('face_embeddings.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS face_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            pose_type TEXT NOT NULL,
            embedding BLOB NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def init_auth_database():
    conn = sqlite3.connect('auth.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_requests (
            email TEXT,
            otp TEXT,
            expiresAt INTEGER
        )
    ''')
    conn.commit()
    conn.close()


def base64_to_image(base64_string):
    """Convert base64 string to PIL Image for MTCNN"""
    try:
        print(f"📸 Processing base64 string, length: {len(base64_string)}")
        print(f"📸 First 50 chars: {base64_string[:50]}")
        
        # Check if it's a data URL and extract the base64 part
        if base64_string.startswith('data:image'):
            if 'base64,' in base64_string:
                base64_string = base64_string.split('base64,')[1]
                print("✅ Removed data URL prefix")
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        print(f"✅ Base64 decoded, image data length: {len(image_data)}")
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        print(f"✅ PIL Image created, size: {image.size}")
        
        return image
    except Exception as e:
        print(f"❌ Error converting base64 to image: {e}")
        return None

def extract_face_embedding(image):
    """Extract face embedding using your trained FaceNet model"""
    try:
        print("🔍 Starting MTCNN face detection...")
        
        # Detect and align face (same as your trained model)
        faces, probs = mtcnn(image, return_prob=True)
        
        if faces is None:
            print("❌ No faces detected by MTCNN")
            return None, "No face detected"
        
        print(f"✅ Faces detected: {len(faces)}")
        
        # FIXED: Handle probs conversion properly
        if faces.dim() == 3:
            faces = faces.unsqueeze(0)
        
        # Convert probs to tensor safely
        if probs is not None:
            # Ensure probs is a proper tensor/array
            if isinstance(probs, np.ndarray):
                # If it's object dtype, convert to float
                if probs.dtype == np.object_:
                    probs = probs.astype(np.float32)
                probs_tensor = torch.tensor(probs)
            else:
                probs_tensor = torch.tensor(probs) if not isinstance(probs, torch.Tensor) else probs
            
            # Use the face with highest probability
            if len(probs_tensor) > 1:
                best_idx = probs_tensor.argmax().item()
                faces = faces[best_idx:best_idx+1]
                print(f"✅ Using face with highest probability: {probs_tensor[best_idx]:.3f}")
            elif len(probs_tensor) == 1:
                print(f"✅ Single face detected with probability: {probs_tensor[0]:.3f}")

        # Normalize exactly like your trained model
        faces = (faces - 127.5) / 128.0

        # Generate embedding
        with torch.no_grad():
            embedding = facenet(faces.to(device))
            embedding = F.normalize(embedding, p=2, dim=1)
        
        print(f"✅ Embedding generated! Shape: {embedding[0].shape}")
        return embedding[0].cpu().numpy(), "Face processed successfully"
        
    except Exception as e:
        print(f"❌ Error in face processing: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, f"Face processing error: {str(e)}"

def store_embedding(user_id, pose_type, embedding):
    """Store face embedding in database"""
    try:
        conn = sqlite3.connect('face_embeddings.db')
        c = conn.cursor()
        
        embedding_bytes = embedding.astype(np.float32).tobytes()

        
        c.execute('''
            INSERT INTO face_embeddings (user_id, pose_type, embedding, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (user_id, pose_type, embedding_bytes, datetime.now()))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error storing embedding: {e}")
        return False

def get_face_stats():
    """Get statistics about stored faces"""
    try:
        conn = sqlite3.connect('face_embeddings.db')
        c = conn.cursor()
        
        # Get total number of face embeddings
        c.execute('SELECT COUNT(*) FROM face_embeddings')
        total_faces = c.fetchone()[0]
        
        # Get number of unique users
        c.execute('SELECT COUNT(DISTINCT user_id) FROM face_embeddings')
        unique_users = c.fetchone()[0]
        
        # Get faces per user
        c.execute('''
            SELECT user_id, COUNT(*) as face_count 
            FROM face_embeddings 
            GROUP BY user_id
        ''')
        users_faces = c.fetchall()
        
        # Get latest registrations
        c.execute('''
            SELECT user_id, pose_type, timestamp 
            FROM face_embeddings 
            ORDER BY timestamp DESC 
            LIMIT 10
        ''')
        recent_registrations = c.fetchall()
        
        conn.close()
        
        return {
            "total_faces": total_faces,
            "unique_users": unique_users,
            "users_faces": [
                {"user_id": user_id, "face_count": count} 
                for user_id, count in users_faces
            ],
            "recent_registrations": [
                {"user_id": user_id, "pose_type": pose, "timestamp": timestamp} 
                for user_id, pose, timestamp in recent_registrations
            ]
        }
        
    except Exception as e:
        return {"error": f"Error getting stats: {str(e)}"}

@app.route('/')
def home():
    try:
        stats = get_face_stats()
        if "error" in stats:
            return jsonify({
                "message": "Face Registration Server is running",
                "error": stats["error"],
                "endpoints": {
                    "register_face": "/register-face (POST)",
                    "recognize_face": "/recognize-face (POST)",
                    "face_stats": "/face-stats (GET)",
                    "user_faces": "/user-faces/<user_id> (GET)"
                }
            })
        
        return jsonify({
            "message": "Face Registration Server is running",
            "database_stats": {
                "total_faces_stored": stats["total_faces"],
                "unique_users": stats["unique_users"]
            },
            "endpoints": {
                "register_face": "/register-face (POST)",
                "recognize_face": "/recognize-face (POST)",
                "face_stats": "/face-stats (GET)",
                "user_faces": "/user-faces/<user_id> (GET)"
            }
        })
    except Exception as e:
        return jsonify({
            "message": "Face Registration Server is running",
            "error": f"Could not fetch database stats: {str(e)}",
            "endpoints": {
                "register_face": "/register-face (POST)",
                "recognize_face": "/recognize-face (POST)"
            }
        })

@app.route('/face-stats', methods=['GET'])
def face_stats():
    """Get detailed statistics about stored faces"""
    stats = get_face_stats()
    if "error" in stats:
        return jsonify({"success": False, "error": stats["error"]})
    
    return jsonify({
        "success": True,
        "stats": stats
    })

@app.route('/user-faces/<user_id>', methods=['GET'])
def get_user_faces(user_id):
    """Get all face data for a specific user"""
    try:
        conn = sqlite3.connect('face_embeddings.db')
        c = conn.cursor()
        
        c.execute('''
            SELECT pose_type, timestamp 
            FROM face_embeddings 
            WHERE user_id = ? 
            ORDER BY timestamp DESC
        ''', (user_id,))
        
        faces = c.fetchall()
        conn.close()
        
        return jsonify({
            "success": True,
            "user_id": user_id,
            "face_count": len(faces),
            "faces": [
                {"pose_type": pose, "timestamp": timestamp} 
                for pose, timestamp in faces
            ]
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": f"Error getting user faces: {str(e)}"})
    

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data received"})
        
        user_id = data.get('userId')
        base64_image = data.get('image')
        pose_type = data.get('poseType')
        
        print(f"📝 Registration request - User: {user_id}, Pose: {pose_type}")
        
        if not all([user_id, base64_image, pose_type]):
            return jsonify({"success": False, "error": "Missing required fields"})
        
        # Convert base64 to PIL Image
        image = base64_to_image(base64_image)
        if image is None:
            return jsonify({"success": False, "error": "Invalid image data"})
        
        # Extract face embedding using your trained model
        embedding, message = extract_face_embedding(image)
        
        if embedding is None:
            return jsonify({"success": False, "error": message})
        
        # Store embedding in database
        if store_embedding(user_id, pose_type, embedding):
            return jsonify({
                "success": True,
                "message": f"Face registered successfully for {pose_type} pose",
                "embedding_shape": embedding.shape,
                "embedding_type": "facenet_vggface2"  # Identify the model used
            })
        else:
            return jsonify({"success": False, "error": "Failed to store embedding"})
            
    except Exception as e:
        print(f"❌ Server error in register_face: {str(e)}")
        return jsonify({"success": False, "error": f"Server error: {str(e)}"})

# FIXED RECOGNITION ENDPOINT
@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data received"})
            
        base64_image = data.get('image')
        
        if not base64_image:
            return jsonify({"success": False, "error": "No image provided"})
        
        print("🔍 Starting face recognition...")
        
        # Convert and process image
        image = base64_to_image(base64_image)
        if image is None:
            return jsonify({"success": False, "error": "Invalid image data"})
        
        # Extract embedding from input image
        input_embedding, message = extract_face_embedding(image)
        if input_embedding is None:
            return jsonify({"success": False, "error": message})
        
        # Convert to tensor for comparison
        input_embedding_tensor = torch.tensor(input_embedding).unsqueeze(0).to(device)
        input_embedding_tensor = F.normalize(input_embedding_tensor, p=2, dim=1)
        
        # Get all stored embeddings from database
        conn = sqlite3.connect('face_embeddings.db')
        c = conn.cursor()
        c.execute('SELECT user_id, embedding FROM face_embeddings')
        rows = c.fetchall()
        conn.close()
        
        print(f"📊 Comparing against {len(rows)} stored embeddings")
        
        if not rows:
            return jsonify({"success": True, "recognized": False, "message": "No registered faces in database"})
        
        best_similarity = 0
        best_user_id = None
        
        for user_id, embedding_bytes in rows:
            try:
                # Convert stored embedding back to numpy
                stored_embedding = np.frombuffer(embedding_bytes, dtype=np.float32)
                stored_embedding_tensor = torch.tensor(stored_embedding).unsqueeze(0).to(device)
                stored_embedding_tensor = F.normalize(stored_embedding_tensor, p=2, dim=1)
                
                # Calculate similarity (same as your trained model)
                similarity = torch.mm(input_embedding_tensor, stored_embedding_tensor.t()).item()
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_user_id = user_id
                    
            except Exception as e:
                print(f"⚠️ Error processing embedding for user {user_id}: {e}")
                continue
        
        # Use the same threshold as your trained model
        recognition_threshold = 0.65
        
        print(f"🎯 Best similarity: {best_similarity:.3f} with user: {best_user_id}")
        
        if best_similarity > recognition_threshold:
            return jsonify({
                "success": True,
                "recognized": True,
                "user_id": best_user_id,
                "similarity": best_similarity,
                "message": f"Recognized {best_user_id} with {best_similarity:.2f} similarity"
            })
        else:
            return jsonify({
                "success": True,
                "recognized": False,
                "similarity": best_similarity,
                "message": f"Unknown face (similarity: {best_similarity:.2f})"
            })
            
    except Exception as e:
        print(f"❌ Error in recognize_face: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Recognition error: {str(e)}"})


@app.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"success": False, "error": "Email is required"})

    otp = str(random.randint(100000, 999999))
    expires_at = int(time.time()) + 300

    conn = sqlite3.connect('auth.db')
    c = conn.cursor()
    c.execute("DELETE FROM password_reset_requests WHERE email = ?", (email,))
    c.execute("INSERT INTO password_reset_requests (email, otp, expiresAt) VALUES (?, ?, ?)", 
              (email, otp, expires_at))
    conn.commit()
    conn.close()

    # ⚠️ 为开发阶段保留 print（你可以看到 OTP）
    print(f"📧 OTP sent to {email}: {otp}")

    # ⭐ 这里加入 Resend Email（最简单）
    try:
        resend.Emails.send({
            "from": "Fundora App <onboarding@resend.dev>",
            "to": email,
            "subject": "Your OTP Code",
            "html": f"<p>Your OTP is <b>{otp}</b></p>"
        })
        print("📨 Email sent successfully")
    except Exception as e:
        print("❌ Email sending error:", e)

    return jsonify({"success": True, "message": "OTP generated and sent"})


@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get("email")
    otp = data.get("otp")

    conn = sqlite3.connect('auth.db')
    c = conn.cursor()
    c.execute("SELECT otp, expiresAt FROM password_reset_requests WHERE email = ?", (email,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"success": False, "error": "No OTP request found"})

    saved_otp, expires_at = row

    if otp != saved_otp:
        conn.close()
        return jsonify({"success": False, "error": "Invalid OTP"})

    if time.time() > expires_at:
        conn.close()
        return jsonify({"success": False, "error": "OTP expired"})

    # Delete the OTP after successful verification (single-use)
    c.execute("DELETE FROM password_reset_requests WHERE email = ?", (email,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "OTP verified"})

@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get("email")
    new_password = data.get("newPassword")

    conn = sqlite3.connect('auth.db')
    c = conn.cursor()
    
    user_conn = sqlite3.connect('userAuth.db')
    user_c = user_conn.cursor()

    user_c.execute("UPDATE users SET password=? WHERE email=?", (new_password, email))
    user_conn.commit()
    user_conn.close()

    return jsonify({"success": True, "message": "Password reset successful"})


if __name__ == '__main__':
    # Initialize database
    init_database()
    init_auth_database()
    
    # Check and display stored faces on startup
    stats = get_face_stats()
    if "error" not in stats:
        print(f"\n📊 FACE DATABASE STATISTICS:")
        print(f"Total faces stored: {stats['total_faces']}")
        print(f"Unique users: {stats['unique_users']}")
        print(f"👥 Faces per user:")
        for user in stats['users_faces']:
            print(f"  - User {user['user_id']}: {user['face_count']} faces")
    else:
        print(f"❌ Error loading stats: {stats['error']}")
    
    print("Starting Face Registration Server with Trained FaceNet...")
    print(f"Using device: {device}")
    app.run(host='0.0.0.0', port=5000, debug=True)
