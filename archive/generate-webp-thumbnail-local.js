const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 输入输出路径
const rootInputDir = 'C:/Users/Power/Wiki-media/gallery';
const rootOutputDir = path.join(rootInputDir, '0_preview');

// 支持的图片扩展名
const supportedExtensions = ['.jpg', '.jpeg', '.png'];

/**
 * 获取一级子目录（排除 0_preview）
 */
function getSubdirectories(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '0_preview')
    .map(d => d.name);
}

/**
 * 获取所有需要转换的图像文件路径
 */
function getAllImageFiles() {
  const imageFiles = [];

  const subdirs = getSubdirectories(rootInputDir);
  subdirs.forEach(subdir => {
    const fullSubdirPath = path.join(rootInputDir, subdir);
    const files = fs.readdirSync(fullSubdirPath);

    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (supportedExtensions.includes(ext)) {
        const inputFilePath = path.join(fullSubdirPath, file);

        const baseName = path.parse(file).name;
        const outputFileName = baseName + '.webp';
        const outputSubdir = path.join(rootOutputDir, subdir);
        const outputFilePath = path.join(outputSubdir, outputFileName);

        if (!fs.existsSync(outputFilePath)) {
          imageFiles.push({
            input: inputFilePath,
            output: outputFilePath,
            fileName: file
          });
        }
      }
    });
  });

  return imageFiles;
}

/**
 * 执行图像转换
 */
async function convertImages() {
  const imageFiles = getAllImageFiles();
  const total = imageFiles.length;

  if (total === 0) {
    console.log('✅ 没有需要转换的新图片。');
    return;
  }

  console.log(`开始转换 ${total} 张图片...\n`);

  for (let i = 0; i < total; i++) {
    const { input, output, fileName } = imageFiles[i];
    fs.mkdirSync(path.dirname(output), { recursive: true });

    try {
      // 获取原始图片尺寸
      const metadata = await sharp(input).metadata();
      
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

      // 使用适当的压缩质量（70%），确保预览图质量良好且文件大小小于原图
      const quality = 70;

      await sharp(input)
        .rotate() // ✅ 根据 EXIF 正确旋转
        .withMetadata({ orientation: undefined }) // ✅ 保留其他 EXIF，去除 Orientation
        .resize(previewWidth, previewHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: quality }) // ✅ 转为 WebP，使用70%质量
        .toFile(output);

      const percent = ((i + 1) / total * 100).toFixed(1);
      console.log(`✔️ (${i + 1}/${total}) ${percent}% - ${fileName} → ${path.relative(rootOutputDir, output)} (${previewWidth}x${previewHeight}, 质量:${quality}%)`);
    } catch (err) {
      console.error(`❌ 转换失败: ${input}`, err);
    }
  }

  console.log('\n✅ 全部转换完成。');
}

// 执行主流程
convertImages();
