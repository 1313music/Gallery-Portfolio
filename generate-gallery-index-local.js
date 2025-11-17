#!/usr/bin/env node

/**
 * 图片目录索引生成器 (本地版本)
 * 为 images.1701701.xyz 项目生成本地图片索引
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("========================================");
console.log("图片目录索引生成器 (本地版本)");
console.log("========================================");

// 配置
const PROJECT_DIR = __dirname; // 当前项目目录
const OUTPUT_FILE = "gallery-index.json";

console.log(`项目目录: ${PROJECT_DIR}`);
console.log(`输出文件: ${OUTPUT_FILE}`);
console.log();

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.BMP', '.WEBP'];

// 构建图片URL（本地路径）
function buildImageUrls(categoryName, fileName, fileExt) {
    // 使用相对路径，因为图片将在本地服务器上提供
    const originalUrl = `/${categoryName}/${fileName}${fileExt}`;
    const previewUrl = `/${categoryName}/${fileName}${fileExt}`; // 预览图暂时使用原图
    return { originalUrl, previewUrl };
}

// 主函数
function generateGalleryIndex() {
    const gallery = {};
    let totalImages = 0;
    
    // 读取项目目录下的所有子目录
    const items = fs.readdirSync(PROJECT_DIR, { withFileTypes: true });
    const categories = items
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => !name.startsWith('.') && name !== 'public' && name !== 'archive' && name !== 'backup' && name !== 'node_modules');
    
    console.log(`找到分类目录: ${categories.join(', ')}`);
    console.log();
    
    for (const categoryName of categories) {
        console.log(`处理分类: ${categoryName}`);
        
        const categoryPath = path.join(PROJECT_DIR, categoryName);
        const images = [];
        
        // 读取分类目录下的所有文件
        let files = [];
        try {
            files = fs.readdirSync(categoryPath);
        } catch (error) {
            console.warn(`无法读取目录 ${categoryName}: ${error.message}`);
            continue;
        }
        
        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            let stat;
            
            try {
                stat = fs.statSync(filePath);
            } catch (error) {
                console.warn(`无法读取文件 ${file}: ${error.message}`);
                continue;
            }
            
            if (stat.isFile()) {
                const ext = path.extname(file).toLowerCase();
                
                if (IMAGE_EXTENSIONS.includes(ext)) {
                    // 获取原始文件扩展名（保持原始大小写）
                    const originalExt = path.extname(file);
                    // 使用原始扩展名提取文件名
                    const fileName = path.basename(file, originalExt);
                    const { originalUrl, previewUrl } = buildImageUrls(categoryName, fileName, originalExt);
                    
                    const imageInfo = {
                        name: fileName,
                        original: originalUrl,
                        preview: previewUrl,
                        category: categoryName
                    };
                    
                    images.push(imageInfo);
                    totalImages++;
                }
            }
        }
        
        // 按文件名排序
        images.sort((a, b) => a.name.localeCompare(b.name));
        
        gallery[categoryName] = {
            name: categoryName,
            images: images,
            count: images.length
        };
        
        console.log(`  完成分类 ${categoryName}，共 ${images.length} 张图片`);
    }
    
    // 生成最终的JSON结构
    const output = {
        gallery: gallery,
        total_images: totalImages,
        generated_at: new Date().toISOString()
    };
    
    // 写入文件
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    
    console.log();
    console.log("========================================");
    console.log("索引生成完成！");
    console.log(`总图片数: ${totalImages}`);
    console.log(`输出文件: ${OUTPUT_FILE}`);
    console.log("========================================");
}

// 运行主函数
try {
    generateGalleryIndex();
} catch (error) {
    console.error("生成索引时发生错误:", error.message);
    process.exit(1);
}