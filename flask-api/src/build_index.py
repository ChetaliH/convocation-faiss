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

# import os, numpy as np, faiss
# from deepface import DeepFace

# dataset_dir = "../dataset/convocation-2024"
# output_dir = "../embeddings"
# os.makedirs(output_dir, exist_ok=True)

# model_name = "ArcFace"
# detector_backend = "mtcnn"

# embeddings, filenames = [], []

# print("=== Building FAISS index with multiple faces per image ===")

# for filename in os.listdir(dataset_dir):
#     if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
#         continue

#     filepath = os.path.join(dataset_dir, filename)

#     try:
#         # Extract all faces
#         faces = DeepFace.extract_faces(filepath, detector_backend=detector_backend, enforce_detection=False)
#         print(f"{filename}: found {len(faces)} faces")

#         for i, face in enumerate(faces):
#             face_data = face["face"] 

          
#             rep = DeepFace.represent(
#                 face_data,
#                 model_name=model_name,
#                 detector_backend="skip",  
#                 enforce_detection=False
#             )[0]["embedding"]

#             emb = np.array(rep).astype("float32")
#             emb = emb / (np.linalg.norm(emb) + 1e-10)  # normalize

#             embeddings.append(emb)
#             # Save with face index so we know which face from the image
#             filenames.append(f"{filename}_face{i+1}")

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

# print(f"Index built with {len(filenames)} faces (from {len(os.listdir(dataset_dir))} images)")

import os
import numpy as np
import faiss
from deepface import DeepFace
from PIL import Image
import cv2

# Configuration
dataset_dir = "../dataset/convocation-2024"
output_dir = "../embeddings"
os.makedirs(output_dir, exist_ok=True)

model_name = "ArcFace"
detector_backend = "mtcnn"

# Image preprocessing settings
MAX_IMAGE_SIZE = 800  # Maximum dimension (width or height)
JPEG_QUALITY = 85     # Quality for temporary processing

def resize_image_for_processing(image_path, max_size=MAX_IMAGE_SIZE):
    """
    Resize image for processing without modifying the original file.
    Returns PIL Image object.
    """
    try:
        # Open image with PIL
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Get current dimensions
            width, height = img.size
            
            # Calculate new dimensions while maintaining aspect ratio
            if width > height:
                if width > max_size:
                    new_width = max_size
                    new_height = int((height * max_size) / width)
                else:
                    new_width, new_height = width, height
            else:
                if height > max_size:
                    new_height = max_size
                    new_width = int((width * max_size) / height)
                else:
                    new_width, new_height = width, height
            
            # Resize if necessary
            if new_width != width or new_height != height:
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"  Resized from {width}x{height} to {new_width}x{new_height}")
            
            return img
            
    except Exception as e:
        print(f"  Error resizing image: {e}")
        return None

def pil_to_cv2(pil_image):
    """Convert PIL Image to OpenCV format for DeepFace"""
    # Convert PIL RGB to OpenCV BGR
    opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    return opencv_image

def process_image_efficiently(filepath, filename):
    """
    Process a single image with memory-efficient resizing
    """
    faces_data = []
    
    try:
        print(f"Processing {filename}...")
        
        # Resize image for processing
        resized_img = resize_image_for_processing(filepath)
        if resized_img is None:
            return faces_data
        
        # Convert PIL to OpenCV format for DeepFace
        cv2_image = pil_to_cv2(resized_img)
        
        # Extract all faces from the resized image
        faces = DeepFace.extract_faces(
            cv2_image, 
            detector_backend=detector_backend, 
            enforce_detection=False
        )
        
        print(f"  Found {len(faces)} faces")
        
        for i, face in enumerate(faces):
            face_data = face["face"]
            
            # Generate embedding
            rep = DeepFace.represent(
                face_data,
                model_name=model_name,
                detector_backend="skip",
                enforce_detection=False
            )[0]["embedding"]
            
            # Normalize embedding
            emb = np.array(rep).astype("float32")
            emb = emb / (np.linalg.norm(emb) + 1e-10)
            
            # Store face data
            faces_data.append({
                'embedding': emb,
                'filename': f"{filename}_face{i+1}",
                'face_index': i+1,
                'original_filename': filename
            })
        
        # Clean up memory
        del resized_img, cv2_image
        
    except Exception as e:
        print(f"  Error processing {filename}: {e}")
    
    return faces_data

# Initialize storage
embeddings = []
filenames = []
face_metadata = []

print("=== Building FAISS index with optimized image processing ===")
print(f"Max image dimension: {MAX_IMAGE_SIZE}px")

# Process all images
total_images = len([f for f in os.listdir(dataset_dir) 
                   if f.lower().endswith((".jpg", ".jpeg", ".png"))])
processed_images = 0

for filename in os.listdir(dataset_dir):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    
    processed_images += 1
    filepath = os.path.join(dataset_dir, filename)
    
    print(f"\n[{processed_images}/{total_images}] {filename}")
    
    # Process image efficiently
    faces_data = process_image_efficiently(filepath, filename)
    
    # Add to collections
    for face_data in faces_data:
        embeddings.append(face_data['embedding'])
        filenames.append(face_data['filename'])
        face_metadata.append({
            'original_filename': face_data['original_filename'],
            'face_index': face_data['face_index']
        })

print(f"\n=== Processing Complete ===")
print(f"Processed {processed_images} images")
print(f"Found {len(embeddings)} faces total")

if len(embeddings) == 0:
    print("No faces found! Check your dataset directory and image files.")
    exit(1)

# Convert to numpy array
embeddings = np.array(embeddings).astype("float32")

# Debug information
print(f"\nEmbeddings shape: {embeddings.shape}")
print(f"First 5 embedding norms: {np.linalg.norm(embeddings[:5], axis=1)}")

# Build FAISS index
print("\n=== Building FAISS Index ===")
dim = embeddings.shape[1]
index = faiss.IndexFlatIP(dim)  # Inner Product (cosine similarity for normalized vectors)
index.add(embeddings)

# Save index and metadata
index_path = os.path.join(output_dir, "faces.index")
filenames_path = os.path.join(output_dir, "filenames.npy")
metadata_path = os.path.join(output_dir, "face_metadata.npy")

faiss.write_index(index, index_path)
np.save(filenames_path, np.array(filenames))
np.save(metadata_path, np.array(face_metadata))

print(f"\n=== Index Built Successfully ===")
print(f"Index saved to: {index_path}")
print(f"Filenames saved to: {filenames_path}")
print(f"Metadata saved to: {metadata_path}")
print(f"Total faces indexed: {len(filenames)}")
print(f"Average faces per image: {len(filenames)/processed_images:.2f}")

# Verify index
print(f"\n=== Verification ===")
print(f"Index dimension: {index.d}")
print(f"Index size: {index.ntotal}")
print("Index build complete!")