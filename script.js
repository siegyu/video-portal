// 1. 获取 HTML 元素引用
const sidebarNavTree = document.getElementById('video-navigation-tree'); // 左侧导航栏
const listView = document.getElementById('list-view'); // 右侧内容区: 列表
const playerView = document.getElementById('player-view'); // 右侧内容区: 播放器
const headerVideoTitle = document.getElementById('header-video-title'); // 顶部标题
const videoPlayer = document.getElementById('video-player');
const toggleListBtn = document.getElementById('toggle-list-btn'); // 顶部“完整列表”按钮
const courseCatalogContainer = document.getElementById('course-catalog-container'); // 列表容器

let currentActiveLink = null; // 跟踪当前高亮链接

/**
 * 切换右侧视图模式：列表视图 vs 播放器视图
 * @param {string} mode - 'list' 或 'player'
 */
function toggleView(mode) {
    if (mode === 'list') {
        listView.classList.remove('d-none');
        playerView.classList.add('d-none');
        toggleListBtn.classList.add('d-none'); // 隐藏按钮
        headerVideoTitle.classList.add('d-none'); // 隐藏顶部标题
        videoPlayer.pause(); // 列表模式下暂停播放
        
    } else if (mode === 'player') {
        listView.classList.add('d-none');
        playerView.classList.remove('d-none');
        toggleListBtn.classList.remove('d-none'); // 显示按钮
        headerVideoTitle.classList.remove('d-none'); // 显示顶部标题
    }
}

/**
 * 2. 核心函数：加载视频并更新标题
 * @param {string} url - 视频文件的 URL
 * @param {string} fullTitle - 完整的 L1/L2/L3/L4 标题
 * @param {HTMLElement} linkElement - 被点击的链接元素 (用于高亮)
 */
function loadVideo(url, fullTitle, linkElement) {
    toggleView('player'); // 切换到播放器视图
    
    // 1. 更新顶部标题
    headerVideoTitle.textContent = fullTitle;
    
    // 2. 更新播放器
    if (videoPlayer.src !== url) {
        videoPlayer.src = url;
        videoPlayer.load(); 
        videoPlayer.play(); 
    }
    
    // 3. 高亮当前播放的菜单项
    if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
    }
    if (linkElement) {
        linkElement.classList.add('active');
        currentActiveLink = linkElement;
    }
}


/**
 * 3. 构建新的列表视图 (L1/L2 Tab/L3/L4 List)
 * 这是首页/主页的全部内容
 * @param {Array} data - 从 videos_index.json 加载的结构化数据
 */
function buildListView(data) {
    courseCatalogContainer.innerHTML = ''; 

    if (!data || data.length === 0) {
        courseCatalogContainer.innerHTML = '<p class="p-3 text-muted">未找到视频目录数据。</p>';
        return;
    }
    
    // 默认不加载播放器，只生成列表
    const fullCatalogHTML = [];
    
    // 遍历 L1 (学期)
    data.forEach((semester, index1) => {
        const semesterBlock = document.createElement('div');
        semesterBlock.className = 'semester-block shadow'; // L1: 学期块
        semesterBlock.innerHTML = `<h5 class="text-white mb-3">${semester.title}</h5>`;
        
        // L2: 课程横向 Tab 导航
        const tabListId = `tab-list-${index1}`;
        const tabContentId = `tab-content-${index1}`;
        
        const tabList = document.createElement('ul');
        tabList.className = 'nav nav-tabs border-secondary mt-3 mb-3';
        tabList.id = tabListId;
        tabList.setAttribute('role', 'tablist');

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.id = tabContentId;
        
        semester.courses.forEach((course, index2) => {
            const courseTabId = `course-${index1}-${index2}`;
            const isActive = index2 === 0; 

            // L2 Tab 标题
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.setAttribute('role', 'presentation');
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}" id="${courseTabId}-tab" data-bs-toggle="tab" data-bs-target="#${courseTabId}" type="button" role="tab" aria-controls="${courseTabId}" aria-selected="${isActive}">
                    ${course.title}
                </button>
            `;
            tabList.appendChild(tabItem);

            // L2 Tab 内容区域
            const courseContent = document.createElement('div');
            courseContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            courseContent.id = courseTabId;
            courseContent.setAttribute('role', 'tabpanel');
            
            const contentRow = document.createElement('div');
            contentRow.className = 'row mt-3';
            
            // 遍历 L3 (周)
            course.weeks.forEach((week) => {
                const weekColumn = document.createElement('div');
                weekColumn.className = 'col-lg-3 col-md-4 col-sm-6 mb-4'; 
                
                weekColumn.innerHTML = `<h6 class="week-title">${week.title}</h6>`; // L3: 周标题
                
                // L4: 小节无序列表
                const sectionList = document.createElement('ul');
                sectionList.className = 'section-list'; 
                
                week.sections.forEach((section) => {
                    // 构建完整的标题字符串，用于顶部导航栏显示
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link';
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; 
                    
                    // 绑定点击事件，调用 loadVideo 函数
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink);
                        
                        // 由于导航栏是单独的，我们还需要在左侧导航栏中找到对应的链接进行高亮
                        highlightSidebarLink(section.url);
                    };

                    sectionList.innerHTML += `<li>${sectionLink.outerHTML}</li>`;
                });
                weekColumn.appendChild(sectionList);
                contentRow.appendChild(weekColumn);
            });
            
            courseContent.appendChild(contentRow);
            tabContent.appendChild(courseContent);
        });

        semesterBlock.appendChild(tabList);
        semesterBlock.appendChild(tabContent);
        courseCatalogContainer.appendChild(semesterBlock);
    });
}


/**
 * 4. 构建左侧永久可见的树形导航栏
 * @param {Array} data - JSON 数据
 */
function buildSidebarNavigation(data) {
    sidebarNavTree.innerHTML = '';
    
    // 遍历 L1 (学期)
    data.forEach((semester, index1) => {
        const semesterHeader = document.createElement('div');
        semesterHeader.className = 'list-group-item bg-dark border-secondary text-primary fw-bold p-2';
        semesterHeader.textContent = semester.title;
        sidebarNavTree.appendChild(semesterHeader);

        // L2 (课程)
        semester.courses.forEach((course, index2) => {
            const courseHeader = document.createElement('div');
            courseHeader.className = 'list-group-item bg-dark-sidebar border-secondary fw-semibold p-2';
            courseHeader.textContent = course.title;
            sidebarNavTree.appendChild(courseHeader);

            // 遍历 L3 (周) 和 L4 (小节)
            course.weeks.forEach((week) => {
                const weekHeader = document.createElement('div');
                weekHeader.className = 'list-group-item bg-dark-sidebar border-secondary ps-3 py-1 fw-normal text-muted'; 
                weekHeader.textContent = week.title;
                sidebarNavTree.appendChild(weekHeader);

                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'list-group-item list-group-item-action bg-dark-sidebar border-secondary py-1 ps-4 section-link-sidebar';
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; 
                    sectionLink.setAttribute('data-url', section.url); // 存储 URL 用于高亮和播放
                    
                    // 绑定点击事件，调用 loadVideo 函数
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink);
                    };

                    sidebarNavTree.appendChild(sectionLink);
                });
            });
        });
    });
}

/**
 * 5. 高亮左侧导航栏的对应链接
 * @param {string} url - 视频的 URL
 */
function highlightSidebarLink(url) {
     document.querySelectorAll('.section-link-sidebar.active').forEach(el => {
        el.classList.remove('active');
    });
    const link = document.querySelector(`.section-link-sidebar[data-url="${url}"]`);
    if (link) {
        link.classList.add('active');
        currentActiveLink = link;
        
        // 确保被点击的链接可见（如果有滚动条）
        link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


/**
 * 6. 主执行流程：加载 JSON 数据
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始显示列表视图 (满足要求：首次载入显示完整列表)
    toggleView('list'); 
    
    // 点击顶部品牌/Logo 时返回列表视图
    document.getElementById('home-link').onclick = (e) => {
        e.preventDefault();
        toggleView('list');
    };
    
    // 使用 fetch API 加载 JSON 文件
    fetch('videos_index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 构建右侧的列表视图 (首页)
            buildListView(data); 
            // 构建左侧的永久导航栏
            buildSidebarNavigation(data); 
        })
        .catch(error => {
            console.error('加载 JSON 失败:', error);
            courseCatalogContainer.innerHTML = `<p class="p-5 text-danger text-center">目录加载失败: ${error.message}</p>`;
        });
});