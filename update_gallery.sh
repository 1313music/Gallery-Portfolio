#!/bin/bash

# 图片库自动更新脚本
# 使用方法: ./update_gallery.sh [选项]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 显示帮助信息
show_help() {
    echo "图片库自动更新脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -c, --check         检查并更新所有分类的图片"
    echo "  -c [分类名]         检查并更新指定分类的图片"
    echo "  -d, --daemon [分钟] 以守护进程模式运行，默认30分钟检查一次"
    echo "  -o, --once          只执行一次更新检查"
    echo "  -p, --push          更新后推送到Git"
    echo ""
    echo "示例:"
    echo "  $0 -c               # 检查并更新所有分类"
    echo "  $0 -c PH7           # 只更新PH7分类"
    echo "  $0 -d               # 以守护进程模式运行"
    echo "  $0 -d 60            # 以守护进程模式运行，60分钟检查一次"
}

# 检查Python是否可用
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "错误: 找不到Python解释器"
        exit 1
    fi
}

# 检查并更新图片
update_gallery() {
    local category="$1"
    local auto_mode="$2"
    
    check_python
    
    if [ -n "$category" ]; then
        echo "更新分类: $category"
        $PYTHON_CMD auto_update_gallery.py --category "$category" $auto_mode
    else
        echo "更新所有分类"
        $PYTHON_CMD auto_update_gallery.py $auto_mode
    fi
}

# 推送到Git
push_to_git() {
    echo "检查Git更改..."
    if [ -n "$(git status --porcelain)" ]; then
        echo "发现更改，提交到Git..."
        git add .
        git commit -m "自动更新图片索引 - $(date '+%Y-%m-%d %H:%M:%S')"
        git push origin main
        echo "已推送到Git"
    else
        echo "没有更改需要提交"
    fi
}

# 主逻辑
case "$1" in
    -h|--help)
        show_help
        ;;
    -c|--check)
        if [ -n "$2" ]; then
            update_gallery "$2" ""
        else
            update_gallery "" ""
        fi
        ;;
    -d|--daemon)
        check_python
        interval="${2:-30}"
        echo "以守护进程模式运行，检查间隔: $interval 分钟"
        $PYTHON_CMD auto_update_daemon.py --daemon --interval "$interval"
        ;;
    -o|--once)
        update_gallery "" "--auto"
        ;;
    -p|--push)
        update_gallery "" "--auto"
        push_to_git
        ;;
    *)
        echo "未知选项: $1"
        show_help
        exit 1
        ;;
esac