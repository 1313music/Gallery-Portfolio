# 图片库自动更新工具

这些工具可以帮助您自动管理和更新图片库的索引文件。

## 文件说明

1. **auto_update_gallery.py** - 核心更新脚本，用于扫描图片文件夹并更新gallery-index.json
2. **auto_update_daemon.py** - 守护进程脚本，可以定期运行更新检查
3. **update_gallery.sh** - 便捷的shell脚本，提供简单的命令行接口
4. **update_gallery_index.py** - 原始的更新脚本（已保留）

## 使用方法

### 1. 手动更新所有分类

```bash
./update_gallery.sh -c
```

### 2. 手动更新指定分类

```bash
./update_gallery.sh -c PH7
```

### 3. 一次性自动检查并更新（简洁输出）

```bash
./update_gallery.sh -o
```

### 4. 更新后自动推送到Git

```bash
./update_gallery.sh -p
```

### 5. 以守护进程模式运行（默认30分钟检查一次）

```bash
./update_gallery.sh -d
```

### 6. 以守护进程模式运行（自定义检查间隔）

```bash
./update_gallery.sh -d 60  # 每60分钟检查一次
```

## 直接使用Python脚本

### 更新所有分类

```bash
python3 auto_update_gallery.py
```

### 更新指定分类

```bash
python3 auto_update_gallery.py --category PH7
```

### 自动模式（简洁输出）

```bash
python3 auto_update_gallery.py --auto
```

### 运行守护进程

```bash
python3 auto_update_daemon.py --daemon
```

### 自定义检查间隔的守护进程

```bash
python3 auto_update_daemon.py --daemon --interval 60
```

## 自动化设置

### 使用cron定时任务

1. 编辑crontab:
   ```bash
   crontab -e
   ```

2. 添加以下行（每30分钟检查一次）:
   ```
   */30 * * * * cd /path/to/your/gallery && ./update_gallery.sh -o
   ```

### 使用launchd（macOS）

1. 创建plist文件:
   ```bash
   nano ~/Library/LaunchAgents/com.gallery.autoupdate.plist
   ```

2. 添加以下内容:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.gallery.autoupdate</string>
       <key>ProgramArguments</key>
       <array>
           <string>/path/to/your/gallery/update_gallery.sh</string>
           <string>-o</string>
       </array>
       <key>WorkingDirectory</key>
       <string>/path/to/your/gallery</string>
       <key>StartInterval</key>
       <integer>1800</integer>  <!-- 1800秒 = 30分钟 -->
       <key>RunAtLoad</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/path/to/your/gallery/auto_update.log</string>
       <key>StandardErrorPath</key>
       <string>/path/to/your/gallery/auto_update.log</string>
   </dict>
   </plist>
   ```

3. 加载服务:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.gallery.autoupdate.plist
   ```

## 日志文件

所有操作都会记录到`auto_update.log`文件中，包括:
- 检查时间
- 添加的图片数量
- 错误信息（如果有）
- Git操作结果

## 注意事项

1. 确保脚本有执行权限（已设置）
2. 确保Python 3已安装
3. 确保Git已配置并可访问远程仓库
4. 守护进程模式下，脚本会在后台持续运行
5. 每次更新前会自动创建gallery-index.json的备份文件

## 故障排除

如果遇到问题，请检查:
1. Python是否正确安装
2. 文件权限是否正确
3. Git配置是否正确
4. 日志文件中的错误信息

## 示例工作流程

1. 添加新图片到PH7文件夹
2. 运行 `./update_gallery.sh -c PH7` 更新PH7分类
3. 运行 `./update_gallery.sh -p` 提交并推送到Git
4. 或者直接运行 `./update_gallery.sh -d` 启动守护进程，自动处理所有步骤