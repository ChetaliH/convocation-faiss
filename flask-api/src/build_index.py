# import os, numpy as np, faiss
# from deepface import DeepFace

# dataset_dir = "../dataset/celebrity"
# output_dir = "../embeddings"
# os.makedirs(output_dir, exist_ok=True)

# model_name = "ArcFace"   # try ArcFace instead of Facenet
# detector_backend = "mtcnn"  # more accurate than opencv

# embeddings, filenames = [], []

# print("=== Building FAISS index ===")

# for filename in os.listdir(dataset_dir):
#     if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
#         continue
#     filepath = os.path.join(dataset_dir, filename)

#     try:
#         rep = DeepFace.represent(
#             filepath,
#             model_name=model_name,
#             detector_backend=detector_backend,
#             enforce_detection=False
#         )[0]["embedding"]

#         emb = np.array(rep).astype("float32")
#         # normalize
#         emb = emb / (np.linalg.norm(emb) + 1e-10)

#         embeddings.append(emb)
#         filenames.append(filename)

#     except Exception as e:
#         print(f"Error processing {filename}: {e}")

# # Convert to numpy
# embeddings = np.array(embeddings).astype("float32")

# # Debug norms
# print("Embeddings shape:", embeddings.shape)
# print("First 5 norms:", np.linalg.norm(embeddings[:5], axis=1))

# # Build FAISS index
# dim = embeddings.shape[1]
# index = faiss.IndexFlatIP(dim)
# index.add(embeddings)

# # Save
# faiss.write_index(index, os.path.join(output_dir, "faces.index"))
# np.save(os.path.join(output_dir, "filenames.npy"), np.array(filenames))

# print(f"Index built with {len(filenames)} images")

import os, numpy as np, faiss
from deepface import DeepFace

dataset_dir = "../dataset/convocation-2024"
output_dir = "../embeddings"
os.makedirs(output_dir, exist_ok=True)

model_name = "ArcFace"
detector_backend = "mtcnn"

embeddings, filenames = [], []

print("=== Building FAISS index with multiple faces per image ===")

for filename in os.listdir(dataset_dir):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    filepath = os.path.join(dataset_dir, filename)

    try:
        # Extract all faces
        faces = DeepFace.extract_faces(filepath, detector_backend=detector_backend, enforce_detection=False)
        print(f"{filename}: found {len(faces)} faces")

        for i, face in enumerate(faces):
            face_data = face["face"] 

          
            rep = DeepFace.represent(
                face_data,
                model_name=model_name,
                detector_backend="skip",  
                enforce_detection=False
            )[0]["embedding"]

            emb = np.array(rep).astype("float32")
            emb = emb / (np.linalg.norm(emb) + 1e-10)  # normalize

            embeddings.append(emb)
            # Save with face index so we know which face from the image
            filenames.append(f"{filename}_face{i+1}")

    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Convert to numpy
embeddings = np.array(embeddings).astype("float32")

# Debug norms
print("Embeddings shape:", embeddings.shape)
print("First 5 norms:", np.linalg.norm(embeddings[:5], axis=1))

# Build FAISS index
dim = embeddings.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(embeddings)

# Save
faiss.write_index(index, os.path.join(output_dir, "faces.index"))
np.save(os.path.join(output_dir, "filenames.npy"), np.array(filenames))

print(f"Index built with {len(filenames)} faces (from {len(os.listdir(dataset_dir))} images)")
