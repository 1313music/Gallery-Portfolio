import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const REGION = process.env.R2_REGION || "auto";
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME;
const IMAGE_DIR = (process.env.R2_IMAGE_DIR || "").replace(/^\/+|\/+$/g, "");

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

async function verifyThumbnails() {
  console.log("========================================");
  console.log("验证 PH7 目录缩略图");
  console.log("========================================");
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`目录前缀: ${IMAGE_DIR || '(root)'}`);

  const prefix = IMAGE_DIR ? `${IMAGE_DIR}/0_preview/PH7/` : "0_preview/PH7/";
  
  try {
    // 列出所有PH7目录的缩略图
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
      })
    );

    const thumbnails = listResponse.Contents || [];
    console.log(`找到 ${thumbnails.length} 个PH7缩略图`);

    // 验证前几个缩略图
    const sampleSize = Math.min(5, thumbnails.length);
    console.log(`\n验证前 ${sampleSize} 个缩略图:`);
    
    for (let i = 0; i < sampleSize; i++) {
      const thumbnail = thumbnails[i];
      try {
        const headResponse = await s3.send(
          new HeadObjectCommand({
            Bucket: BUCKET,
            Key: thumbnail.Key,
          })
        );
        console.log(`✓ ${thumbnail.Key} (${headResponse.ContentLength} bytes)`);
      } catch (error) {
        console.log(`✗ ${thumbnail.Key} - 错误: ${error?.message || error}`);
      }
    }

    // 检查是否有任何缩略图缺失
    console.log("\n检查缩略图完整性...");
    const localDir = "PH7";
    const fs = await import("fs");
    const path = await import("path");
    
    if (fs.existsSync(localDir)) {
      const files = fs.readdirSync(localDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
      });
      
      console.log(`本地图片数量: ${imageFiles.length}`);
      console.log(`生成的缩略图数量: ${thumbnails.length}`);
      
      if (imageFiles.length === thumbnails.length) {
        console.log("✓ 所有图片都已生成缩略图");
      } else {
        console.log(`⚠ 缩略图数量不匹配，可能存在缺失的缩略图`);
      }
    }

  } catch (error) {
    console.error("验证失败:", error?.message || error);
  }

  console.log("\n========================================");
  console.log("验证完成");
  console.log("========================================");
}

verifyThumbnails().catch((e) => {
  console.error("发生错误:", e?.message || e);
  process.exit(1);
});