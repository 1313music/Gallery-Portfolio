#!/usr/bin/env python3
import json
import os
import glob
import argparse
from datetime import datetime

def update_gallery_index(category=None, auto_mode=False):
    """
    更新gallery-index.json文件，添加指定分类或所有分类的新图片
    
    参数:
        category: 要更新的分类名称，如果为None则更新所有分类
        auto_mode: 是否为自动模式，自动模式下会输出更简洁的信息
    """
    # 读取现有的gallery-index.json文件
    try:
        with open('gallery-index.json', 'r', encoding='utf-8') as f:
            gallery_data = json.load(f)
    except FileNotFoundError:
        print("错误: 找不到gallery-index.json文件")
        return False
    
    # 获取所有分类目录
    categories = []
    if category:
        if os.path.isdir(category):
            categories = [category]
        else:
            print(f"错误: 找不到分类目录 {category}")
            return False
    else:
        # 自动检测所有分类目录
        for item in os.listdir('.'):
            if os.path.isdir(item) and item not in ['.git', 'public', 'archive', 'backup', 'node_modules']:
                categories.append(item)
    
    total_new_images = 0
    updated_categories = []
    
    for cat in categories:
        # 检查分类是否在gallery-index.json中
        if cat not in gallery_data['gallery']:
            if not auto_mode:
                print(f"警告: 分类 {cat} 不在gallery-index.json中，跳过")
            continue
        
        # 获取分类文件夹中的所有图片文件
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp']
        cat_files = []
        for ext in image_extensions:
            cat_files.extend(glob.glob(os.path.join(cat, ext)))
        cat_files.sort()  # 按文件名排序
        
        # 获取gallery-index.json中已记录的图片
        if 'images' not in gallery_data['gallery'][cat]:
            gallery_data['gallery'][cat]['images'] = []
        
        existing_images = gallery_data['gallery'][cat]['images']
        existing_names = {img['name'] for img in existing_images}
        
        # 添加缺失的图片
        new_images = []
        for file_path in cat_files:
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            
            # 如果图片已经在JSON中，跳过
            if name_without_ext in existing_names:
                continue
            
            # 创建新的图片记录
            new_image = {
                "name": name_without_ext,
                "original": f"https://img.1701701.xyz/api/{cat}/{filename}",
                "preview": f"https://img.1701701.xyz/api/0_preview/{cat}/{name_without_ext}.webp",
                "category": cat
            }
            new_images.append(new_image)
        
        if new_images:
            # 将新图片添加到现有图片列表中
            gallery_data['gallery'][cat]['images'].extend(new_images)
            total_new_images += len(new_images)
            updated_categories.append(cat)
            
            if not auto_mode:
                print(f"分类 {cat}: 添加了 {len(new_images)} 张新图片")
    
    if total_new_images > 0:
        # 更新总图片数
        total_images = 0
        for cat in gallery_data['gallery']:
            total_images += len(gallery_data['gallery'][cat]['images'])
        gallery_data['total_images'] = total_images
        
        # 备份原始文件
        backup_file = f"gallery-index.json.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.system(f"cp gallery-index.json {backup_file}")
        
        # 写回文件
        with open('gallery-index.json', 'w', encoding='utf-8') as f:
            json.dump(gallery_data, f, ensure_ascii=False, indent=2)
        
        if auto_mode:
            print(f"自动更新完成: 添加了 {total_new_images} 张新图片，更新了 {len(updated_categories)} 个分类")
        else:
            print(f"\n更新完成:")
            print(f"- 总共添加了 {total_new_images} 张新图片")
            print(f"- 更新的分类: {', '.join(updated_categories)}")
            print(f"- 整个图库现在共有 {total_images} 张图片")
            print(f"- 已创建备份文件: {backup_file}")
        
        return True
    else:
        if auto_mode:
            print("自动检查完成: 没有发现新图片")
        else:
            print("没有发现新图片，gallery-index.json已是最新")
        return False

def main():
    parser = argparse.ArgumentParser(description='更新gallery-index.json文件，添加新图片')
    parser.add_argument('--category', '-c', help='指定要更新的分类名称')
    parser.add_argument('--auto', '-a', action='store_true', help='自动模式，输出简洁信息')
    
    args = parser.parse_args()
    
    update_gallery_index(args.category, args.auto)

if __name__ == "__main__":
    main()