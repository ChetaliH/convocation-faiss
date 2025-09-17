import os, shutil

lfw_dir = "dataset/lfw-deepfunneled"
flat_dir = "dataset/lfw_flat"
os.makedirs(flat_dir, exist_ok=True)

for root, dirs, files in os.walk(lfw_dir):
    for file in files:
        if file.endswith(".jpg"):
            src = os.path.join(root, file)
            dst = os.path.join(flat_dir, file)
            shutil.copy(src, dst)

print("Flattened dataset saved to", flat_dir)