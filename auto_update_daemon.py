#!/usr/bin/env python3
"""
自动化脚本，定期检查文件夹中的新图片并自动更新gallery-index.json文件
可以设置为cron job或systemd service运行
"""

import os
import sys
import time
import subprocess
from datetime import datetime

def log_message(message):
    """记录日志消息"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")
    
    # 同时写入日志文件
    with open("auto_update.log", "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")

def run_update_script():
    """运行更新脚本"""
    try:
        # 运行自动更新脚本
        result = subprocess.run(
            [sys.executable, "auto_update_gallery.py", "--auto"],
            capture_output=True,
            text=True,
            check=True
        )
        
        if result.stdout:
            log_message(result.stdout.strip())
        
        return True
    except subprocess.CalledProcessError as e:
        log_message(f"错误: 运行更新脚本失败 - {e}")
        if e.stderr:
            log_message(f"错误详情: {e.stderr}")
        return False
    except Exception as e:
        log_message(f"未知错误: {e}")
        return False

def check_git_changes():
    """检查是否有Git更改需要提交"""
    try:
        # 检查Git状态
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            check=True
        )
        
        if result.stdout.strip():
            log_message("检测到文件更改，准备提交到Git")
            
            # 添加所有更改
            subprocess.run(["git", "add", "."], check=True)
            
            # 提交更改
            commit_message = f"自动更新图片索引 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            subprocess.run(["git", "commit", "-m", commit_message], check=True)
            
            # 推送到远程仓库
            subprocess.run(["git", "push", "origin", "main"], check=True)
            
            log_message("已成功提交并推送更改到Git")
            return True
        else:
            log_message("没有文件更改需要提交")
            return False
    except subprocess.CalledProcessError as e:
        log_message(f"Git操作失败: {e}")
        return False

def main():
    """主函数"""
    log_message("开始自动更新图片索引")
    
    # 检查并更新图片索引
    if run_update_script():
        # 如果有更新，提交到Git
        check_git_changes()
    
    log_message("自动更新完成")

def run_daemon(interval_minutes=30):
    """以守护进程模式运行"""
    log_message(f"启动自动更新守护进程，检查间隔: {interval_minutes} 分钟")
    
    while True:
        try:
            main()
            # 等待指定时间
            time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            log_message("收到中断信号，退出守护进程")
            break
        except Exception as e:
            log_message(f"守护进程出错: {e}")
            # 出错后等待一段时间再继续
            time.sleep(60)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='自动更新图片索引的守护进程')
    parser.add_argument('--daemon', '-d', action='store_true', help='以守护进程模式运行')
    parser.add_argument('--interval', '-i', type=int, default=30, help='检查间隔(分钟)，默认30分钟')
    
    args = parser.parse_args()
    
    if args.daemon:
        run_daemon(args.interval)
    else:
        main()