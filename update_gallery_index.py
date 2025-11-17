#!/usr/bin/env python3
import json
import os
import glob

# 读取现有的gallery-index.json文件
with open('gallery-index.json', 'r', encoding='utf-8') as f:
    gallery_data = json.load(f)

# 获取PH7文件夹中的所有图片文件
ph7_folder = 'PH7'
ph7_files = glob.glob(os.path.join(ph7_folder, '*.jpg'))
ph7_files.sort()  # 按文件名排序

# 获取gallery-index.json中已记录的PH7图片
existing_ph7_images = gallery_data['gallery']['PH7']['images']
existing_ph7_names = {img['name'] for img in existing_ph7_images}

# 添加缺失的图片
new_images = []
for file_path in ph7_files:
    filename = os.path.basename(file_path)
    name_without_ext = os.path.splitext(filename)[0]
    
    # 如果图片已经在JSON中，跳过
    if name_without_ext in existing_ph7_names:
        continue
    
    # 创建新的图片记录
    new_image = {
        "name": name_without_ext,
        "original": f"https://img.1701701.xyz/api/PH7/{filename}",
        "preview": f"https://img.1701701.xyz/api/0_preview/PH7/{name_without_ext}.webp",
        "category": "PH7"
    }
    new_images.append(new_image)

# 将新图片添加到现有图片列表中
gallery_data['gallery']['PH7']['images'].extend(new_images)

# 更新总图片数
total_images = 0
for category in gallery_data['gallery']:
    total_images += len(gallery_data['gallery'][category]['images'])
gallery_data['total_images'] = total_images

# 写回文件
with open('gallery-index.json', 'w', encoding='utf-8') as f:
    json.dump(gallery_data, f, ensure_ascii=False, indent=2)

print(f"添加了 {len(new_images)} 张新的PH7图片到gallery-index.json")
print(f"PH7分类现在共有 {len(gallery_data['gallery']['PH7']['images'])} 张图片")
print(f"整个图库现在共有 {total_images} 张图片")