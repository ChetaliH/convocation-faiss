# import numpy as np, faiss
# from deepface import DeepFace

# index = faiss.read_index("../embeddings/faces.index")
# filenames = np.load("../embeddings/filenames.npy")

# query_path = "../query.jpg"

# query_emb = DeepFace.represent(
#     query_path,
#     model_name="Facenet",
#     detector_backend="opencv",
#     enforce_detection=False
# )[0]["embedding"]

# query_emb = np.array(query_emb).astype("float32")
# query_emb = query_emb / np.linalg.norm(query_emb)

# # Search top-5
# D, I = index.search(query_emb.reshape(1, -1), k=5)

# print("Top matches:")
# for rank, idx in enumerate(I[0]):
#     print(f"{rank+1}. {filenames[idx]} (similarity={D[0][rank]:.4f})")

import numpy as np, faiss
from deepface import DeepFace

index = faiss.read_index("../embeddings/faces.index")
filenames = np.load("../embeddings/filenames.npy")

query_path = "../query.jpg"
model_name = "ArcFace"
detector_backend = "mtcnn"

# Extract query embedding
rep = DeepFace.represent(
    query_path,
    model_name=model_name,
    detector_backend=detector_backend,
    enforce_detection=False
)[0]["embedding"]

query_emb = np.array(rep).astype("float32")
query_emb = query_emb / (np.linalg.norm(query_emb) + 1e-10)

print("Query norm:", np.linalg.norm(query_emb))

# Quick sanity check: similarity with first db vector
sample_embedding = np.load("../embeddings/filenames.npy", allow_pickle=True)
print("Raw dot with first db vector:", np.dot(query_emb, query_emb))

# Search top-5
D, I = index.search(query_emb.reshape(1, -1), k=5)

print("\n=== Top Matches ===")
for rank, idx in enumerate(I[0]):
    print(f"{rank+1}. {filenames[idx]} (similarity={D[0][rank]:.4f})")