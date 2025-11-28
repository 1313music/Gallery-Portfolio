import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const REGION = process.env.R2_REGION || "auto";
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME;
const IMAGE_DIR = (process.env.R2_IMAGE_DIR || "").replace(/^\/+|\/+$/g, "");
const QUALITY = Number(process.env.IMAGE_COMPRESSION_QUALITY || 80);

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const LOCAL_DIR = "PH7"; // 本地PH7目录

function toPreviewKey(srcKey) {
  // srcKey: Category/Filename.EXT
  const parts = srcKey.split("/");
  if (parts.length < 2) return null;
  const category = parts[0];
  if (category === "0_preview") return null;
  const filename = parts[parts.length - 1];
  const baseName = filename.replace(/\.[^.]+$/, "");
  // 使用与原始脚本相同的路径生成方式
  const prefix = IMAGE_DIR ? `${IMAGE_DIR}/` : "";
  return `${prefix}0_preview/${category}/${baseName}.webp`;
}

async function ensurePreviewExists(srcKey) {
  const previewKey = toPreviewKey(srcKey);
  if (!previewKey) return;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: previewKey }));
    console.log(`预览已存在，跳过: ${previewKey}`);
    return;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode && err.$metadata.httpStatusCode !== 404) {
      throw err;
    }
  }

  try {
    // 直接从本地读取图片文件
    const localFilePath = path.join(LOCAL_DIR, path.basename(srcKey));
    let fileBuffer;
    
    if (fs.existsSync(localFilePath)) {
      console.log(`从本地读取文件: ${localFilePath}`);
      fileBuffer = fs.readFileSync(localFilePath);
    } else {
      console.error(`本地文件不存在: ${localFilePath}`);
      return;
    }

    // 获取原始图片尺寸
    const metadata = await sharp(fileBuffer).metadata();
    
    // 计算预览图尺寸（限制最大宽度或高度为800像素，保持宽高比）
    let previewWidth = metadata.width;
    let previewHeight = metadata.height;
    const maxDimension = 800;
    
    if (previewWidth > maxDimension || previewHeight > maxDimension) {
      if (previewWidth > previewHeight) {
        previewHeight = Math.round((previewHeight * maxDimension) / previewWidth);
        previewWidth = maxDimension;
      } else {
        previewWidth = Math.round((previewWidth * maxDimension) / previewHeight);
        previewHeight = maxDimension;
      }
    }

    // 调整压缩质量，确保预览图比原图小
    // 如果原始质量设置为100，则使用70；否则使用原始质量的75%
    const adjustedQuality = QUALITY >= 100 ? 70 : Math.max(50, Math.round(QUALITY * 0.75));

    const previewBuffer = await sharp(fileBuffer)
      .rotate()
      .resize(previewWidth, previewHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: adjustedQuality })
      .toBuffer();

    // 添加详细的上传日志
    console.log(`准备上传到R2: ${previewKey}`);
    console.log(`文件大小: ${previewBuffer.length} bytes`);
    
    // 添加调试信息
    console.log(`上传参数: Bucket=${BUCKET}, Key=${previewKey}`);
    console.log(`S3配置: Endpoint=${ENDPOINT}, Region=${REGION}`);
    
    // 尝试上传到目标目录 - 使用与测试阶段相同的代码
    console.log("使用与测试阶段相同的上传方法...");
    const uploadResult = await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: previewKey,
        Body: previewBuffer,
        ContentType: "image/webp",
      })
    );
    
    console.log(`上传结果:`, uploadResult);
    console.log(`预览生成完成: ${previewKey}`);
  } catch (error) {
    console.error(`处理失败: ${srcKey}`, error?.message || error);
    console.error("完整错误:", error);
    
    // 添加错误详情
    if (error.$metadata) {
      console.error(`HTTP状态码: ${error.$metadata.httpStatusCode}`);
      console.error(`请求ID: ${error.$metadata.requestId}`);
    }
    
    // 尝试使用新的S3客户端实例
    console.log("尝试使用新的S3客户端实例...");
    try {
      // 创建一个新的S3客户端实例
      const newS3Client = new S3Client({
        region: REGION,
        endpoint: ENDPOINT,
        credentials: {
          accessKeyId: ACCESS_KEY,
          secretAccessKey: SECRET_KEY,
        },
      });
      
      // 直接从本地读取图片文件
      const localFilePath = path.join(LOCAL_DIR, path.basename(srcKey));
      const fileBuffer = fs.readFileSync(localFilePath);
      
      // 简化处理图片
      const previewBuffer = await sharp(fileBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();
      
      // 使用新的S3客户端实例上传
      await newS3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: previewKey,
          Body: previewBuffer,
          ContentType: "image/webp",
        })
      );
      console.log(`使用新客户端上传成功: ${previewKey}`);
    } catch (newClientError) {
      console.error("新客户端上传失败:", newClientError?.message || newClientError);
      
      // 尝试使用简化的上传参数
      console.log("尝试使用简化的上传参数...");
      try {
        const localFilePath = path.join(LOCAL_DIR, path.basename(srcKey));
        const fileBuffer = fs.readFileSync(localFilePath);
        
        // 使用简化的上传参数
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: previewKey,
            Body: fileBuffer,
          })
        );
        console.log(`使用简化参数上传成功: ${previewKey}`);
      } catch (simpleError) {
        console.error("简化参数上传失败:", simpleError?.message || simpleError);
        throw simpleError;
      }
    }
  }
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function main() {
  console.log("========================================");
  console.log("生成 PH7 目录缩略图 (WebP)");
  console.log("========================================");
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`目录前缀: ${IMAGE_DIR || '(root)'}`);
  console.log(`访问密钥: ${ACCESS_KEY.substring(0, 8)}...`);
  console.log(`密钥长度: ${SECRET_KEY.length}`);

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

  // 测试S3权限 - 尝试列出存储桶内容
  console.log("\n测试S3权限 - 尝试列出存储桶内容...");
  try {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 5,
      })
    );
    console.log(`成功列出存储桶内容，找到 ${listResponse.Contents?.length || 0} 个对象`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log("前几个对象:");
      listResponse.Contents.slice(0, 3).forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
  } catch (listError) {
    console.error("列出存储桶内容失败:", listError?.message || listError);
  }

  // 测试S3权限 - 尝试获取一个现有对象的元数据
  console.log("\n测试S3权限 - 尝试获取一个现有对象的元数据...");
  try {
    const headResponse = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: "PH7/Fg00KXz864Vwkm3K36v0HAKSNVSiv3.jpg", // 尝试获取第一个图片的元数据
      })
    );
    console.log(`成功获取对象元数据，大小: ${headResponse.ContentLength} bytes`);
  } catch (headError) {
    console.error("获取对象元数据失败:", headError?.message || headError);
  }

  // 测试S3权限 - 尝试获取一个现有预览图的元数据
  console.log("\n测试S3权限 - 尝试获取一个现有预览图的元数据...");
  try {
    const headResponse = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: "0_preview/BB/008sgNsfgy1h1bne2qgz0j30s40yygrk.webp", // 尝试获取一个预览图的元数据
      })
    );
    console.log(`成功获取预览图元数据，大小: ${headResponse.ContentLength} bytes`);
  } catch (headError) {
    console.error("获取预览图元数据失败:", headError?.message || headError);
  }

  // 测试S3权限 - 尝试上传一个简单的测试文件
  console.log("\n测试S3权限 - 尝试上传一个简单的测试文件...");
  try {
    const testBuffer = Buffer.from("test file content");
    const testKey = `test_${Date.now()}.txt`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testKey,
        Body: testBuffer,
        ContentType: "text/plain",
      })
    );
    console.log(`测试文件上传成功: ${testKey}`);
    
    // 删除测试文件
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testKey }));
    console.log(`测试文件已删除: ${testKey}`);
  } catch (testError) {
    console.error("测试文件上传失败:", testError?.message || testError);
  }

  // 测试S3权限 - 尝试上传一个简单的测试图片到根目录
  console.log("\n测试S3权限 - 尝试上传一个简单的测试图片到根目录...");
  try {
    const testImagePath = path.join(LOCAL_DIR, imageFiles[0]);
    const testImageBuffer = fs.readFileSync(testImagePath);
    const testImageKey = `test_${Date.now()}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testImageKey,
        Body: testImageBuffer,
        ContentType: "image/jpeg",
      })
    );
    console.log(`测试图片上传成功: ${testImageKey}`);
    
    // 删除测试图片
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testImageKey }));
    console.log(`测试图片已删除: ${testImageKey}`);
  } catch (testImageError) {
    console.error("测试图片上传失败:", testImageError?.message || testImageError);
  }

  // 测试S3权限 - 尝试上传一个简单的测试图片到0_preview目录
  console.log("\n测试S3权限 - 尝试上传一个简单的测试图片到0_preview目录...");
  try {
    const testImagePath = path.join(LOCAL_DIR, imageFiles[0]);
    const testImageBuffer = fs.readFileSync(testImagePath);
    const testImageKey = `0_preview/test_${Date.now()}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testImageKey,
        Body: testImageBuffer,
        ContentType: "image/jpeg",
      })
    );
    console.log(`测试图片上传成功: ${testImageKey}`);
    
    // 删除测试图片
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testImageKey }));
    console.log(`测试图片已删除: ${testImageKey}`);
  } catch (testImageError) {
    console.error("测试图片上传失败:", testImageError?.message || testImageError);
  }

  // 测试S3权限 - 尝试上传一个简单的测试图片到0_preview/PH7目录
  console.log("\n测试S3权限 - 尝试上传一个简单的测试图片到0_preview/PH7目录...");
  try {
    const testImagePath = path.join(LOCAL_DIR, imageFiles[0]);
    const testImageBuffer = fs.readFileSync(testImagePath);
    const testImageKey = `0_preview/PH7/test_${Date.now()}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testImageKey,
        Body: testImageBuffer,
        ContentType: "image/jpeg",
      })
    );
    console.log(`测试图片上传成功: ${testImageKey}`);
    
    // 删除测试图片
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testImageKey }));
    console.log(`测试图片已删除: ${testImageKey}`);
  } catch (testImageError) {
    console.error("测试图片上传失败:", testImageError?.message || testImageError);
  }

  // 测试S3权限 - 尝试使用与实际缩略图生成相同的流程
  console.log("\n测试S3权限 - 尝试使用与实际缩略图生成相同的流程...");
  try {
    const testImagePath = path.join(LOCAL_DIR, imageFiles[0]);
    const testImageBuffer = fs.readFileSync(testImagePath);
    
    // 使用sharp处理图片
    const testPreviewBuffer = await sharp(testImageBuffer)
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    
    // 上传到与实际缩略图相同的路径格式
    const testPreviewKey = `0_preview/PH7/test_${Date.now()}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testPreviewKey,
        Body: testPreviewBuffer,
        ContentType: "image/webp",
      })
    );
    console.log(`测试缩略图上传成功: ${testPreviewKey}`);
    
    // 删除测试缩略图
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testPreviewKey }));
    console.log(`测试缩略图已删除: ${testPreviewKey}`);
  } catch (testPreviewError) {
    console.error("测试缩略图上传失败:", testPreviewError?.message || testPreviewError);
  }

  // 测试S3权限 - 尝试直接模拟实际缩略图生成流程
  console.log("\n测试S3权限 - 尝试直接模拟实际缩略图生成流程...");
  try {
    const testImagePath = path.join(LOCAL_DIR, imageFiles[0]);
    const testImageBuffer = fs.readFileSync(testImagePath);
    const testImageName = path.basename(testImagePath);
    const testSrcKey = `${LOCAL_DIR}/${testImageName}`;
    
    // 模拟toPreviewKey函数
    const parts = testSrcKey.split("/");
    const category = parts[0];
    const filename = parts[parts.length - 1];
    const baseName = filename.replace(/\.[^.]+$/, "");
    const prefix = IMAGE_DIR ? `${IMAGE_DIR}/` : "";
    const testPreviewKey = `${prefix}0_preview/${category}/${baseName}.webp`;
    
    console.log(`模拟生成的预览图路径: ${testPreviewKey}`);
    
    // 使用sharp处理图片
    const testPreviewBuffer = await sharp(testImageBuffer)
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    
    // 上传到模拟生成的路径
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testPreviewKey,
        Body: testPreviewBuffer,
        ContentType: "image/webp",
      })
    );
    console.log(`模拟缩略图上传成功: ${testPreviewKey}`);
    
    // 删除模拟缩略图
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testPreviewKey }));
    console.log(`模拟缩略图已删除: ${testPreviewKey}`);
  } catch (testPreviewError) {
    console.error("模拟缩略图上传失败:", testPreviewError?.message || testPreviewError);
  }

  // 测试S3权限 - 尝试直接复制实际缩略图生成流程的代码
  console.log("\n测试S3权限 - 尝试直接复制实际缩略图生成流程的代码...");
  try {
    const testSrcKey = `${LOCAL_DIR}/${imageFiles[0]}`;
    const testPreviewKey = toPreviewKey(testSrcKey);
    
    console.log(`实际生成的预览图路径: ${testPreviewKey}`);
    
    // 直接从本地读取图片文件
    const localFilePath = path.join(LOCAL_DIR, path.basename(testSrcKey));
    const fileBuffer = fs.readFileSync(localFilePath);
    
    // 获取原始图片尺寸
    const metadata = await sharp(fileBuffer).metadata();
    
    // 计算预览图尺寸
    let previewWidth = metadata.width;
    let previewHeight = metadata.height;
    const maxDimension = 800;
    
    if (previewWidth > maxDimension || previewHeight > maxDimension) {
      if (previewWidth > previewHeight) {
        previewHeight = Math.round((previewHeight * maxDimension) / previewWidth);
        previewWidth = maxDimension;
      } else {
        previewWidth = Math.round((previewWidth * maxDimension) / previewHeight);
        previewHeight = maxDimension;
      }
    }

    // 调整压缩质量
    const adjustedQuality = QUALITY >= 100 ? 70 : Math.max(50, Math.round(QUALITY * 0.75));

    const previewBuffer = await sharp(fileBuffer)
      .rotate()
      .resize(previewWidth, previewHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: adjustedQuality })
      .toBuffer();

    // 上传到目标目录
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testPreviewKey,
        Body: previewBuffer,
        ContentType: "image/webp",
      })
    );
    console.log(`实际缩略图上传成功: ${testPreviewKey}`);
    
    // 删除实际缩略图
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testPreviewKey }));
    console.log(`实际缩略图已删除: ${testPreviewKey}`);
  } catch (testPreviewError) {
    console.error("实际缩略图上传失败:", testPreviewError?.message || testPreviewError);
  }

  // 测试S3权限 - 尝试直接复制实际缩略图生成流程的代码（简化版）
  console.log("\n测试S3权限 - 尝试直接复制实际缩略图生成流程的代码（简化版）...");
  try {
    const testSrcKey = `${LOCAL_DIR}/${imageFiles[0]}`;
    const testPreviewKey = toPreviewKey(testSrcKey);
    
    console.log(`简化版生成的预览图路径: ${testPreviewKey}`);
    
    // 直接从本地读取图片文件
    const localFilePath = path.join(LOCAL_DIR, path.basename(testSrcKey));
    const fileBuffer = fs.readFileSync(localFilePath);
    
    // 简化处理图片
    const previewBuffer = await sharp(fileBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    // 上传到目标目录
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testPreviewKey,
        Body: previewBuffer,
        ContentType: "image/webp",
      })
    );
    console.log(`简化版缩略图上传成功: ${testPreviewKey}`);
    
    // 删除简化版缩略图
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testPreviewKey }));
    console.log(`简化版缩略图已删除: ${testPreviewKey}`);
  } catch (testPreviewError) {
    console.error("简化版缩略图上传失败:", testPreviewError?.message || testPreviewError);
  }

  // 测试S3权限 - 尝试使用不同的S3客户端实例
  console.log("\n测试S3权限 - 尝试使用不同的S3客户端实例...");
  try {
    // 创建一个新的S3客户端实例
    const newS3Client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    });

    const testSrcKey = `${LOCAL_DIR}/${imageFiles[0]}`;
    const testPreviewKey = toPreviewKey(testSrcKey);
    
    console.log(`新客户端生成的预览图路径: ${testPreviewKey}`);
    
    // 直接从本地读取图片文件
    const localFilePath = path.join(LOCAL_DIR, path.basename(testSrcKey));
    const fileBuffer = fs.readFileSync(localFilePath);
    
    // 简化处理图片
    const previewBuffer = await sharp(fileBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    // 使用新的S3客户端实例上传
    await newS3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: testPreviewKey,
        Body: previewBuffer,
        ContentType: "image/webp",
      })
    );
    console.log(`新客户端缩略图上传成功: ${testPreviewKey}`);
    
    // 删除新客户端缩略图
    await newS3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testPreviewKey }));
    console.log(`新客户端缩略图已删除: ${testPreviewKey}`);
  } catch (testPreviewError) {
    console.error("新客户端缩略图上传失败:", testPreviewError?.message || testPreviewError);
  }

  // 为每个图片文件生成缩略图
  console.log("\n开始处理所有图片文件...");
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of imageFiles) {
    const srcKey = `${LOCAL_DIR}/${file}`;
    console.log(`\n处理: ${srcKey}`);
    
    try {
      await ensurePreviewExists(srcKey);
      processedCount++;
    } catch (error) {
      console.error(`处理失败: ${srcKey}`, error?.message || error);
      errorCount++;
    }
  }

  console.log("\n========================================");
  console.log("处理完成统计:");
  console.log(`总图片数: ${imageFiles.length}`);
  console.log(`已处理: ${processedCount}`);
  console.log(`已跳过: ${skippedCount}`);
  console.log(`处理失败: ${errorCount}`);
  console.log("========================================");
  console.log("\nPH7目录缩略图生成完成");
}

main().catch((e) => {
  console.error("发生错误:", e?.message || e);
  console.error("完整错误:", e);
  
  // 添加错误详情
  if (e.$metadata) {
    console.error(`HTTP状态码: ${e.$metadata.httpStatusCode}`);
    console.error(`请求ID: ${e.$metadata.requestId}`);
  }
  
  process.exit(1);
});