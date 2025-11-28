#!/usr/bin/env node

/**
 * 上传PH7目录中的所有原始图片到R2存储桶
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

console.log("========================================");
console.log("上传PH7目录原始图片到R2存储桶");
console.log("========================================");

// 配置
const BUCKET = process.env.R2_BUCKET_NAME;
const ENDPOINT = process.env.R2_ENDPOINT;
const REGION = process.env.R2_REGION || "auto";
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const IMAGE_DIR = process.env.R2_IMAGE_DIR || ""; // R2 根目录下的父目录，比如 "gallery/"

const LOCAL_DIR = "PH7"; // 本地PH7目录
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

// 初始化 S3 客户端
const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// 检查文件是否已存在于R2
async function fileExistsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

// 上传文件到R2
async function uploadFileToR2(localPath, r2Key) {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  let contentType = "application/octet-stream";
  
  if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".png") contentType = "image/png";
  else if (ext === ".gif") contentType = "image/gif";
  else if (ext === ".bmp") contentType = "image/bmp";
  else if (ext === ".webp") contentType = "image/webp";

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3.send(command);
  console.log(`上传成功: ${r2Key} (${fileBuffer.length} bytes)`);
}

// 主函数
async function uploadPH7Images() {
  console.log(`本地目录: ${LOCAL_DIR}`);
  console.log(`R2存储桶: ${BUCKET}`);
  console.log(`R2目录前缀: ${IMAGE_DIR || '(root)'}`);
  console.log();

  // 检查本地目录是否存在
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`错误: 本地目录 ${LOCAL_DIR} 不存在`);
    process.exit(1);
  }

  // 获取本地PH7目录中的所有图片文件
  const files = fs.readdirSync(LOCAL_DIR);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });

  console.log(`发现本地图片数量: ${imageFiles.length}`);

  let uploadCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const file of imageFiles) {
    const localPath = path.join(LOCAL_DIR, file);
    const prefix = IMAGE_DIR ? `${IMAGE_DIR}/` : "";
    const r2Key = `${prefix}PH7/${file}`;
    
    try {
      // 检查文件是否已存在
      if (await fileExistsInR2(r2Key)) {
        console.log(`文件已存在，跳过: ${r2Key}`);
        skipCount++;
        continue;
      }

      // 上传文件
      await uploadFileToR2(localPath, r2Key);
      uploadCount++;
    } catch (error) {
      console.error(`上传失败: ${r2Key}`, error?.message || error);
      errorCount++;
    }
  }

  console.log();
  console.log("========================================");
  console.log("上传完成统计:");
  console.log(`总图片数: ${imageFiles.length}`);
  console.log(`已上传: ${uploadCount}`);
  console.log(`已跳过: ${skipCount}`);
  console.log(`上传失败: ${errorCount}`);
  console.log("========================================");
  console.log("\nPH7目录原始图片上传完成");
}

// 运行主函数
uploadPH7Images().catch((err) => {
  console.error("上传过程中发生错误:", err.message);
  process.exit(1);
});