# import os
# import numpy as np
# import faiss
# from deepface import DeepFace
# from flask import Flask, request, jsonify, send_file

# # === CONFIG ===
# INDEX_PATH = "embeddings/faces.index"
# FILENAMES_PATH = "embeddings/filenames.npy"
# DATASET_DIR = "dataset/celebrity"
# MODEL_NAME = "ArcFace"
# DETECTOR_BACKEND = "mtcnn"

# # === LOAD INDEX + FILENAMES ===
# print("Loading FAISS index...")
# index = faiss.read_index(INDEX_PATH)
# filenames = np.load(FILENAMES_PATH, allow_pickle=True)

# # === FLASK APP ===
# app = Flask(__name__)

# @app.route("/search", methods=["POST"])
# def search_faces():
#     if "file" not in request.files:
#         return jsonify({"error": "No file uploaded"}), 400

#     file = request.files["file"]

#     # Save query temporarily
#     query_path = os.path.join("uploads", file.filename)
#     os.makedirs("uploads", exist_ok=True)
#     file.save(query_path)

#     # Extract embedding
#     rep = DeepFace.represent(
#         query_path,
#         model_name=MODEL_NAME,
#         detector_backend=DETECTOR_BACKEND,
#         enforce_detection=False
#     )[0]["embedding"]

#     query_emb = np.array(rep).astype("float32")
#     query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-10)

#     # Search in FAISS
#     D, I = index.search(query_emb.reshape(1, -1), k=5)

#     results = []
#     for rank, idx in enumerate(I[0]):
#         match_file = filenames[idx]
#         match_path = os.path.join(DATASET_DIR, match_file.split("_face")[0])  # original image
#         results.append({
#             "filename": match_file,
#             "similarity": float(D[0][rank]),
#             "path": match_path
#         })

#     return jsonify(results)

# @app.route("/download/<filename>", methods=["GET"])
# def download_image(filename):
#     filepath = os.path.join(DATASET_DIR, filename)
#     if os.path.exists(filepath):
#         return send_file(filepath, mimetype="image/jpeg")
#     return jsonify({"error": "File not found"}), 404

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)

# import os
# import numpy as np
# import faiss
# from deepface import DeepFace
# from flask import Flask, request, jsonify, send_file

# # === CONFIG ===
# INDEX_PATH = "embeddings/faces.index"
# FILENAMES_PATH = "embeddings/filenames.npy"
# DATASET_DIR = "dataset/celebrity"
# MODEL_NAME = "ArcFace"
# DETECTOR_BACKEND = "mtcnn"

# # === LOAD INDEX + FILENAMES ===
# print("Loading FAISS index...")
# index = faiss.read_index(INDEX_PATH)
# filenames = np.load(FILENAMES_PATH, allow_pickle=True)

# # === FLASK APP ===
# app = Flask(__name__)

# # --- NEW: Home route with upload form ---
# @app.route("/")
# def home():
#     return """
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <title>Face Search</title>
#     </head>
#     <body>
#         <h2>Upload an image to search</h2>
#         <form action="/search" method="post" enctype="multipart/form-data">
#             <input type="file" name="file" accept="image/*" required>
#             <input type="submit" value="Search">
#         </form>
#     </body>
#     </html>
#     """

# @app.route("/search", methods=["POST"])
# def search_faces():
#     if "file" not in request.files:
#         return jsonify({"error": "No file uploaded"}), 400

#     file = request.files["file"]

#     # Save query temporarily
#     query_path = os.path.join("uploads", file.filename)
#     os.makedirs("uploads", exist_ok=True)
#     file.save(query_path)

#     # Extract embedding
#     rep = DeepFace.represent(
#         query_path,
#         model_name=MODEL_NAME,
#         detector_backend=DETECTOR_BACKEND,
#         enforce_detection=False
#     )[0]["embedding"]

#     query_emb = np.array(rep).astype("float32")
#     query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-10)

#     # Search in FAISS
#     D, I = index.search(query_emb.reshape(1, -1), k=5)

#     results = []
#     for rank, idx in enumerate(I[0]):
#         match_file = filenames[idx]
#         match_path = os.path.join(DATASET_DIR, match_file.split("_face")[0])  # original image
#         results.append({
#             "filename": match_file,
#             "similarity": float(D[0][rank]),
#             "path": match_path
#         })

#     return jsonify(results)

# @app.route("/download/<filename>", methods=["GET"])
# def download_image(filename):
#     filepath = os.path.join(DATASET_DIR, filename)
#     if os.path.exists(filepath):
#         return send_file(filepath, mimetype="image/jpeg")
#     return jsonify({"error": "File not found"}), 404

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)

# import os
# import numpy as np
# import faiss
# from deepface import DeepFace
# from flask import Flask, request, jsonify, send_file
# from flasgger import Swagger

# # === CONFIG ===
# INDEX_PATH = "embeddings/faces.index"
# FILENAMES_PATH = "embeddings/filenames.npy"
# DATASET_DIR = "dataset/convocation-2024"
# MODEL_NAME = "ArcFace"
# DETECTOR_BACKEND = "mtcnn"

# # === LOAD INDEX + FILENAMES ===
# print("Loading FAISS index...")
# index = faiss.read_index(INDEX_PATH)
# filenames = np.load(FILENAMES_PATH, allow_pickle=True)

# # === FLASK APP ===
# app = Flask(__name__)
# swagger = Swagger(app)

# @app.route("/")
# def home():
#     return """
#     <h2>Welcome to Face Search API</h2>
#     <p>Go to <a href="/apidocs">/apidocs</a> to test the endpoints.</p>
#     """

# @app.route("/search", methods=["POST"])
# def search_faces():
#     """
#     Search for similar faces
#     ---
#     consumes:
#       - multipart/form-data
#     parameters:
#       - name: file
#         in: formData
#         type: file
#         required: true
#         description: Upload an image file for face search
#     responses:
#       200:
#         description: List of matching images
#         examples:
#           application/json:
#             - filename: "celebrity1_face0.jpg"
#               similarity: 0.87
#               path: "dataset/celebrity/celebrity1.jpg"
#     """
#     if "file" not in request.files:
#         return jsonify({"error": "No file uploaded"}), 400

#     file = request.files["file"]

#     # Save query temporarily
#     query_path = os.path.join("uploads", file.filename)
#     os.makedirs("uploads", exist_ok=True)
#     file.save(query_path)

   
#     rep = DeepFace.represent(
#         query_path,
#         model_name=MODEL_NAME,
#         detector_backend=DETECTOR_BACKEND,
#         enforce_detection=False
#     )[0]["embedding"]

#     query_emb = np.array(rep).astype("float32")
#     query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-10)

#     # Search in FAISS
#     D, I = index.search(query_emb.reshape(1, -1), k=5)

#     results = []
#     for rank, idx in enumerate(I[0]):
#         match_file = filenames[idx]
#         match_path = os.path.join(DATASET_DIR, match_file.split("_face")[0])  # original image
#         results.append({
#             "filename": match_file,
#             "similarity": float(D[0][rank]),
#             "path": match_path
#         })

#     return jsonify(results)

# @app.route("/download/<filename>", methods=["GET"])
# def download_image(filename):
#     """
#     Download an image by filename
#     ---
#     parameters:
#       - name: filename
#         in: path
#         type: string
#         required: true
#         description: The filename of the image to download
#     responses:
#       200:
#         description: Returns the image file
#       404:
#         description: File not found
#     """
#     filepath = os.path.join(DATASET_DIR, filename)
#     if os.path.exists(filepath):
#         return send_file(filepath, mimetype="image/jpeg")
#     return jsonify({"error": "File not found"}), 404

# if __name__ == "__main__":
#     app.run(debug=True, port=5000)

import os
import numpy as np
import faiss
from deepface import DeepFace
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Add this import
from flasgger import Swagger

# === CONFIG ===
INDEX_PATH = "embeddings/faces.index"
FILENAMES_PATH = "embeddings/filenames.npy"
DATASET_DIR = "dataset/convocation-2024"
MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "mtcnn"

# === LOAD INDEX + FILENAMES ===
print("Loading FAISS index...")
index = faiss.read_index(INDEX_PATH)
filenames = np.load(FILENAMES_PATH, allow_pickle=True)

# === FLASK APP ===
app = Flask(__name__)
CORS(app)  # Add this line to enable CORS for all routes
swagger = Swagger(app)

@app.route("/")
def home():
    return """
    <h2>Welcome to Face Search API</h2>
    <p>Go to <a href="/apidocs">/apidocs</a> to test the endpoints.</p>
    """

@app.route("/search", methods=["POST"])
def search_faces():
    """
    Search for similar faces
    ---
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: Upload an image file for face search
    responses:
      200:
        description: List of matching images
        examples:
          application/json:
            - filename: "celebrity1_face0.jpg"
              similarity: 0.87
              path: "dataset/celebrity/celebrity1.jpg"
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    # Save query temporarily
    query_path = os.path.join("uploads", file.filename)
    os.makedirs("uploads", exist_ok=True)
    file.save(query_path)

    try:
        # Extract embedding
        rep = DeepFace.represent(
            query_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False
        )[0]["embedding"]

        query_emb = np.array(rep).astype("float32")
        query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-10)

        # Search in FAISS
        D, I = index.search(query_emb.reshape(1, -1), k=5)

        results = []
        for rank, idx in enumerate(I[0]):
            match_file = filenames[idx]
            # Remove _face suffix to get original filename
            original_filename = match_file.split("_face")[0]
            match_path = os.path.join(DATASET_DIR, original_filename)
            results.append({
                "filename": match_file,
                "original_filename": original_filename,  # Add original filename for easier access
                "similarity": float(D[0][rank]),
                "path": match_path
            })

        return jsonify(results)

    except Exception as e:
        print(f"Error during face recognition: {str(e)}")
        return jsonify({"error": f"Face recognition failed: {str(e)}"}), 500
    
    finally:
        # Clean up uploaded file
        if os.path.exists(query_path):
            os.remove(query_path)

@app.route("/download/<filename>", methods=["GET"])
def download_image(filename):
    """
    Download an image by filename
    ---
    parameters:
      - name: filename
        in: path
        type: string
        required: true
        description: The filename of the image to download
    responses:
      200:
        description: Returns the image file
      404:
        description: File not found
    """
    filepath = os.path.join(DATASET_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype="image/jpeg")
    return jsonify({"error": "File not found"}), 404

# Add a health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint
    ---
    responses:
      200:
        description: API is healthy
    """
    return jsonify({
        "status": "healthy",
        "message": "Face recognition API is running",
        "index_loaded": index is not None,
        "filenames_loaded": filenames is not None,
        "total_faces": len(filenames) if filenames is not None else 0
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000, host='0.0.0.0')  # Added host='0.0.0.0' for external access