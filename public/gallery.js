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

        // 初始化组件（包括 tagFilter）
        this.initComponents();

        // 处理 URL 参数（此时 tagFilter 已准备好）
        // 只有在URL中有标签参数时才调用handleUrlParams，避免重复设置默认标签
        const path = window.location.pathname;
        const tagFromUrl = path.substring(1); // 移除开头的斜杠
        
        if (tagFromUrl && tagFromUrl !== '') {
            this.handleUrlParams();
        } else {
            // 确保默认标签是"封面"
            if (this.tagFilter.getCurrentTag() !== '封面') {
                this.tagFilter.selectTagByValue('封面');
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

        const path = window.location.pathname;
        const tagFromUrl = path.substring(1); // 移除开头的斜杠

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
            if (window.location.pathname !== '/') {
                window.history.pushState({}, '', '/');
            }
        } else {
            const newUrl = `/${tag}`;
            if (window.location.pathname !== newUrl) {
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
