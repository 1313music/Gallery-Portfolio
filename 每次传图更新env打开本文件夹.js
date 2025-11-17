
R2_ACCESS_KEY_ID=0052418036dd0e00000000002
R2_SECRET_ACCESS_KEY=K0059ZBRWqSS71+SU64tf37yST34eK4
R2_BUCKET_NAME=img1701
R2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
R2_REGION=auto
R2_IMAGE_BASE_URL=https://img.1701701.xyz/api
R2_IMAGE_DIR=""
IMAGE_COMPRESSION_QUALITY=100




官方文档：https://github.com/linyuxuanlin/Gallery-Portfolio

打开本文件夹

以后每次更新图片后，只需在项目文件夹打开终端，执行以下两步：
npm run r2:generate-index  # 重新生成索引
git add gallery-index.json && git commit -m "更新图片" && git push  # 提交并推送


cd ~/Desktop         
cd Gallery-Portfolio
npm run r2:generate-previews
npm run r2:generate-index
git add gallery-index.json && git commit -m "更新图片" && git push



--------
第五步：(可选) 生成 WebP 预览图

如果你希望有更快的预览加载速度：
bash
复制
npm run r2:generate-previews
​注意:​​
这会下载原图、转换、上传预览图，可能较慢
如果跳过，则 previewUrl会直接使用原图
📋 第六步：生成关键索引文件 gallery-index.json
bash
复制
npm run r2:generate-index