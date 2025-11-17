#!/usr/bin/env python3
import json
import os

# 读取JSON文件
file_path = 'gallery-index.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 创建备份
backup_path = 'gallery-index.json.backup'
with open(backup_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# 格式化输出 - 每个图片对象一行
formatted_output = '{"gallery":{'

# 处理每个分类
categories = data['gallery']
for i, (category_name, category_data) in enumerate(categories.items()):
    if i > 0:
        formatted_output += ','
    
    formatted_output += f'"{category_name}":{{"name":"{category_data["name"]}","images":['
    
    # 处理每个图片，每个图片一行
    for j, image in enumerate(category_data['images']):
        if j > 0:
            formatted_output += ','
        formatted_output += '\n  '
        formatted_output += json.dumps(image, separators=(',', ':'), ensure_ascii=False)
    
    formatted_output += ']}'

formatted_output += '}}'

# 写入文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(formatted_output)

print(f"已将图片信息格式化为每个图片一行，并创建了备份文件 {backup_path}")