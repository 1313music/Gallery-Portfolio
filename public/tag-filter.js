// 标签筛选模块
class TagFilter {
    constructor(onTagSelect) {
        this.onTagSelect = onTagSelect;
        this.currentTag = ''; // 初始为空，等待createTagFilter设置
        this.tagContainer = null;
    }

    // 创建标签筛选器
    createTagFilter(categories) {
        this.tagContainer = document.createElement('div');
        this.tagContainer.className = 'tag-filter-vertical';
        
        // 使用文档片段提高性能
        const fragment = document.createDocumentFragment();
        
        // 添加鼠标滚轮事件，实现鼠标悬停在标签栏上时通过滚轮垂直滚动标签栏
        this.tagContainer.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.tagContainer.scrollTop += event.deltaY;
        });
    
        // 辅助函数：将选中的标签滚动到中间
        const centerTagButton = (btn) => {
            const containerHeight = this.tagContainer.clientHeight;
            const btnOffsetTop = btn.offsetTop;
            const btnHeight = btn.clientHeight;
            const scrollTarget = btnOffsetTop - (containerHeight / 2) + (btnHeight / 2);
            this.tagContainer.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        };
    
        // 过滤掉 'all' 和 '0_preview' 标签，并按字母顺序排序
        const filteredCategories = categories.filter(category => 
            category !== 'all' && category !== '0_preview'
        ).sort();
        
        // 添加其他标签
        let coverButton = null;
        let firstCategoryButton = null;
        filteredCategories.forEach(category => {
            const tagButton = document.createElement('button');
            tagButton.className = 'tag';
            tagButton.textContent = category;
            tagButton.addEventListener('click', () => {
                this.selectTag(tagButton, category);
                centerTagButton(tagButton);
            });
            fragment.appendChild(tagButton);
            
            // 保存封面按钮的引用
            if (category === '封面') {
                coverButton = tagButton;
            }
            
            // 保存第一个分类按钮的引用（作为备用）
            if (!firstCategoryButton) {
                firstCategoryButton = tagButton;
            }
        });
    
        // 添加"全部"标签
        const allTag = document.createElement('button');
        allTag.className = 'tag';
        allTag.textContent = 'All';
        allTag.addEventListener('click', () => {
            this.selectTag(allTag, 'all');
            centerTagButton(allTag);
        });
        fragment.appendChild(allTag);
        
        // 注意：这里不再默认选中All标签，由Gallery类的init方法根据URL参数决定
    
        // 一次性添加所有标签
        this.tagContainer.appendChild(fragment);
    
        // 插入到header和gallery之间
        const header = document.querySelector('header');
        header.insertAdjacentElement('afterend', this.tagContainer);
    
        // 利用 IntersectionObserver 监听各个标签按钮是否完全可见
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // 如果标签没有完全展示，则降低透明度，实现"淡化"效果
                if (entry.intersectionRatio < 1) {
                    entry.target.style.opacity = '0.6';
                } else {
                    entry.target.style.opacity = '1';
                }
            });
        }, { root: this.tagContainer, threshold: 1.0 });
    
        // 对所有的标签按钮进行观察
        this.tagContainer.querySelectorAll('.tag').forEach(tagButton => {
            observer.observe(tagButton);
        });
    }

    // 选择标签
    selectTag(selectedButton, tag) {
        // 移除所有标签的选中样式
        this.tagContainer.querySelectorAll('.tag').forEach(t => {
            t.classList.remove('active');
        });
        
        // 设置当前标签的选中样式
        selectedButton.classList.add('active');
        
        this.currentTag = tag;
        // 同时更新ImageLoader的currentTag
        if (window.gallery && window.gallery.imageLoader) {
            window.gallery.imageLoader.currentTag = tag;
        }
        this.onTagSelect(tag);
    }

    // 获取当前选中的标签
    getCurrentTag() {
        return this.currentTag;
    }

    // 根据标签值选择标签
    selectTagByValue(tagValue) {
        if (!this.tagContainer) {
            console.error('tagContainer未初始化');
            return;
        }
        
        const tagButtons = this.tagContainer.querySelectorAll('.tag');
        for (const button of tagButtons) {
            if (button.textContent === tagValue) {
                this.selectTag(button, tagValue);
                // 将选中的标签滚动到中间
                const containerHeight = this.tagContainer.clientHeight;
                const btnOffsetTop = button.offsetTop;
                const btnHeight = button.clientHeight;
                const scrollTarget = btnOffsetTop - (containerHeight / 2) + (btnHeight / 2);
                this.tagContainer.scrollTo({ top: scrollTarget, behavior: 'smooth' });
                break;
            }
        }
    }

    // 销毁标签筛选器
    destroy() {
        if (this.tagContainer && this.tagContainer.parentNode) {
            this.tagContainer.parentNode.removeChild(this.tagContainer);
        }
    }
}

// 导出为全局变量
window.TagFilter = TagFilter;