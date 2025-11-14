// 1. 获取 HTML 元素引用
const listView = document.getElementById('list-view');
const playerView = document.getElementById('player-view');
const courseCatalogContainer = document.getElementById('course-catalog-container');
const videoPlayer = document.getElementById('video-player');
const videoTitle = document.getElementById('current-video-title');
const toggleViewBtn = document.getElementById('toggle-view-btn');

let currentView = 'list'; // 跟踪当前显示的视图

/**
 * 切换视图模式：列表视图 vs 播放器视图
 * @param {string} mode - 'list' 或 'player'
 */
function toggleView(mode) {
    if (mode === 'list') {
        listView.classList.remove('d-none');
        playerView.classList.add('d-none');
        toggleViewBtn.textContent = '返回列表';
        currentView = 'list';
        videoPlayer.pause(); // 列表模式下暂停播放
        
    } else if (mode === 'player') {
        listView.classList.add('d-none');
        playerView.classList.remove('d-none');
        toggleViewBtn.textContent = '返回列表'; // 播放器模式下按钮仍是返回列表
        currentView = 'player';
    }
}

/**
 * 2. 核心函数：加载视频并更新标题
 * @param {string} url - 视频文件的 URL
 * @param {string} title - 视频的小节标题
 * @param {HTMLElement} linkElement - 被点击的链接元素
 */
function loadVideo(url, title, linkElement) {
    toggleView('player'); // 切换到播放器视图
    
    if (videoPlayer.src !== url) {
        videoPlayer.src = url;
        videoPlayer.load(); 
        videoPlayer.play(); 
    }
    videoTitle.textContent = title; 
    
    // 高亮当前播放的菜单项
    document.querySelectorAll('.section-link.active').forEach(el => {
        el.classList.remove('active');
    });
    if (linkElement) {
        linkElement.classList.add('active');
    }
}


/**
 * 3. 构建新的列表视图 (L1/L2 Tab/L3/L4 List)
 * @param {Array} data - 从 videos_index.json 加载的结构化数据
 */
function buildListView(data) {
    courseCatalogContainer.innerHTML = ''; 

    if (!data || data.length === 0) {
        courseCatalogContainer.innerHTML = '<p class="p-3 text-muted">未找到视频目录数据。</p>';
        return;
    }
    
    // 遍历 L1 (学期) - 学期作为块
    data.forEach((semester, index1) => {
        const semesterBlock = document.createElement('div');
        semesterBlock.className = 'semester-block shadow'; // L1: 学期块
        semesterBlock.innerHTML = `<h4 class="text-white">${semester.title}</h4>`;
        
        // L2: 课程横向 Tab 导航
        const tabListId = `tab-list-${index1}`;
        
        const tabList = document.createElement('ul');
        tabList.className = 'nav nav-tabs nav-justified border-secondary mt-3 mb-3';
        tabList.id = tabListId;
        tabList.setAttribute('role', 'tablist');

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        semester.courses.forEach((course, index2) => {
            const courseTabId = `course-${index1}-${index2}`;
            const isActive = index2 === 0; // 默认第一个课程 Tab 激活

            // 创建 L2 Tab 标题
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.setAttribute('role', 'presentation');
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active bg-secondary text-white' : 'text-light'}" id="${courseTabId}-tab" data-bs-toggle="tab" data-bs-target="#${courseTabId}" type="button" role="tab" aria-controls="${courseTabId}" aria-selected="${isActive}">
                    ${course.title}
                </button>
            `;
            tabList.appendChild(tabItem);

            // 创建 L2 Tab 内容区域
            const courseContent = document.createElement('div');
            courseContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            courseContent.id = courseTabId;
            courseContent.setAttribute('role', 'tabpanel');
            courseContent.setAttribute('aria-labelledby', `${courseTabId}-tab`);

            // L3 和 L4 容器使用 Bootstrap Row
            const contentRow = document.createElement('div');
            contentRow.className = 'row';
            
            // 遍历 L3 (周)
            course.weeks.forEach((week) => {
                // L3 容器 (占据一定的列数)
                const weekColumn = document.createElement('div');
                weekColumn.className = 'col-lg-3 col-md-4 col-sm-6 mb-4'; 
                
                weekColumn.innerHTML = `<h5 class="week-title">${week.title}</h5>`; // L3: 周标题
                
                // L4: 小节无序列表
                const sectionList = document.createElement('ul');
                sectionList.className = 'section-list'; 
                
                week.sections.forEach((section) => {
                    const sectionItem = document.createElement('li');
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link';
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; 
                    
                    // 绑定点击事件，调用 loadVideo 函数
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, `${course.title} - ${week.title} - ${section.title}`, sectionLink);
                    };

                    sectionItem.appendChild(sectionLink);
                    sectionList.appendChild(sectionItem);
                });
                weekColumn.appendChild(sectionList);
                contentRow.appendChild(weekColumn); // 将周内容添加到行中
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
 * 4. 主执行流程：加载 JSON 数据
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始显示列表视图，不自动播放视频 (满足要求 3)
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
            buildListView(data);
        })
        .catch(error => {
            console.error('加载 JSON 失败:', error);
            courseCatalogContainer.innerHTML = `<p class="p-5 text-danger text-center">目录加载失败: ${error.message}</p>`;
        });
});