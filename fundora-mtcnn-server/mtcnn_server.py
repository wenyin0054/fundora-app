# face_registration_server.py - UPDATED VERSION
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

app = Flask(__name__)
CORS(app)

# Initialize with your trained model setup
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device, post_process=False)
facenet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

def base64_to_image(base64_string):
    """Convert base64 string to PIL Image for MTCNN"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        return Image.open(io.BytesIO(image_data)).convert('RGB')
    except Exception as e:
        print(f"Error converting base64 to image: {e}")
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
        
        # Use the face with highest probability
        if faces.dim() == 3:
            faces = faces.unsqueeze(0)
        if probs is not None and len(probs) > 1:
            best = int(torch.tensor(probs).argmax().item())
            faces = faces[best:best+1]

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

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data received"})
        
        user_id = data.get('userId')
        base64_image = data.get('image')
        pose_type = data.get('poseType')
        
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
        return jsonify({"success": False, "error": f"Server error: {str(e)}"})

# Add recognition endpoint that matches your trained model
@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json()
        base64_image = data.get('image')
        
        if not base64_image:
            return jsonify({"success": False, "error": "No image provided"})
        
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
        
        if not rows:
            return jsonify({"success": False, "error": "No registered faces"})
        
        best_similarity = 0
        best_user_id = None
        
        for user_id, embedding_bytes in rows:
            # Convert stored embedding back to numpy
            stored_embedding = np.frombuffer(embedding_bytes, dtype=np.float32)
            stored_embedding_tensor = torch.tensor(stored_embedding).unsqueeze(0).to(device)
            stored_embedding_tensor = F.normalize(stored_embedding_tensor, p=2, dim=1)
            
            # Calculate similarity (same as your trained model)
            similarity = torch.mm(input_embedding_tensor, stored_embedding_tensor.t()).item()
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_user_id = user_id
        
        # Use the same threshold as your trained model
        recognition_threshold = 0.65
        
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
        return jsonify({"success": False, "error": f"Recognition error: {str(e)}"})

if __name__ == '__main__':
    print("Starting Face Registration Server with Trained FaceNet...")
    print(f"Using device: {device}")
    app.run(host='0.0.0.0', port=5000, debug=True)