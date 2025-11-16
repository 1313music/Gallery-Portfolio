// 主画廊模块
class Gallery {
    constructor() {
        this.dataLoader = new DataLoader();
        this.tagFilter = null;
        this.imageLoader = null;
        this.isPageLoading = true;
        this.lastWidth = window.innerWidth;

        this.init();
    }

    async init() {
        // 等待页面加载完成
        window.addEventListener('load', () => {
            this.isPageLoading = false;
        });

        // 监听浏览器前进后退按钮
        window.addEventListener('popstate', () => {
            // 确保 tagFilter 初始化后再处理 URL
            setTimeout(() => this.handleUrlParams(), 0);
        });

        // 加载图片数据
        await this.dataLoader.loadGalleryData();

        // 检查URL参数，决定是否默认选中All标签
        const urlParams = new URLSearchParams(window.location.search);
        const tagFromUrl = urlParams.get('tag');
        
        // 初始化组件（包括 tagFilter）
        this.initComponents();

        // 处理 URL 参数（此时 tagFilter 已准备好）
        if (tagFromUrl && tagFromUrl !== '') {
            this.handleUrlParams();
        } else {
            // 确保默认标签是"all"
            if (this.tagFilter.getCurrentTag() !== 'all') {
                this.tagFilter.selectTagByValue('all');
                this.imageLoader.filterImages('all');
            }
        }

        // 初始加载
        this.loadInitialImages();
    }

    initComponents() {
        const galleryElement = document.getElementById('gallery');

        // 初始化图片加载器
        this.imageLoader = new ImageLoader(galleryElement, this.dataLoader);

        // 初始化标签筛选器
        this.tagFilter = new TagFilter((tag) => {
            this.imageLoader.filterImages(tag);
            this.updateUrlForTag(tag);
            // 确保ImageLoader的currentTag与TagFilter的currentTag同步
            this.imageLoader.currentTag = tag;
        });

        // 创建标签筛选器
        const categories = this.dataLoader.getCategories();
        this.tagFilter.createTagFilter(categories);

        // 设置模态窗口事件
        this.imageLoader.setupModalEvents();

        // 设置gallery的margin-top
        this.imageLoader.setGalleryMarginTop();
    }

    // 处理URL参数
    handleUrlParams() {
        if (!this.tagFilter || typeof this.tagFilter.selectTagByValue !== 'function') {
            console.warn('tagFilter 尚未初始化，跳过 handleUrlParams');
            return;
        }

        // 使用URL参数模式：?tag=BB
        const urlParams = new URLSearchParams(window.location.search);
        const tagFromUrl = urlParams.get('tag');

        if (tagFromUrl && tagFromUrl !== '') {
            const categories = this.dataLoader.getCategories();

            if (categories.includes(tagFromUrl)) {
                this.tagFilter.selectTagByValue(tagFromUrl);
                this.imageLoader.filterImages(tagFromUrl);
            } else {
                // 默认选择all标签
                this.tagFilter.selectTagByValue('all');
                this.imageLoader.filterImages('all');
            }
        }
        // 移除else分支，当URL中没有标签参数时，不执行任何操作
        // 这样可以保持initComponents()中设置的默认标签（封面）
    }

    // 更新URL
    updateUrlForTag(tag) {
        if (tag === 'all') {
            // 清除tag参数，回到首页
            const newUrl = window.location.pathname;
            if (window.location.search !== '') {
                window.history.pushState({}, '', newUrl);
            }
        } else {
            // 使用查询参数模式
            const newUrl = `${window.location.pathname}?tag=${encodeURIComponent(tag)}`;
            if (window.location.search !== `?tag=${encodeURIComponent(tag)}`) {
                window.history.pushState({}, '', newUrl);
            }
        }
    }

    loadInitialImages() {
        // 确保imageLoader的currentTag与tagFilter的currentTag同步
        this.imageLoader.currentTag = this.tagFilter.getCurrentTag();
        
        // 加载对应的图片
        this.imageLoader.filterImages(this.imageLoader.currentTag);
        this.imageLoader.updateColumns();

        setTimeout(() => {
            this.imageLoader.checkIfMoreImagesNeeded();
        }, 500);
    }
}

// 页面加载完成后初始化画廊
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new Gallery();
});
