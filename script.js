// 1. 获取 HTML 元素引用
const sidebarNavTree = document.getElementById('video-navigation-tree'); // 左侧导航栏
const listView = document.getElementById('list-view'); // 右侧内容区: 列表
const playerView = document.getElementById('player-view'); // 右侧内容区: 播放器
const headerVideoTitle = document.getElementById('header-video-title'); // 顶部标题
const videoPlayer = document.getElementById('video-player');
const toggleListBtn = document.getElementById('toggle-list-btn'); // 顶部“完整列表”按钮
const courseCatalogContainer = document.getElementById('course-catalog-container'); // 列表容器

let currentActiveLink = null; // 跟踪当前高亮链接
let uniqueIdCounter = 0; // 用于生成唯一的 Collapse ID

/**
 * 切换右侧视图模式：列表视图 vs 播放器视图
 * (保持不变)
 */
function toggleView(mode) {
    if (mode === 'list') {
        listView.classList.remove('d-none');
        playerView.classList.add('d-none');
        toggleListBtn.classList.add('d-none'); 
        headerVideoTitle.classList.remove('d-none'); 
        headerVideoTitle.textContent = '请从左侧选择课程小节';
        videoPlayer.pause(); 
        
    } else if (mode === 'player') {
        listView.classList.add('d-none');
        playerView.classList.remove('d-none');
        toggleListBtn.classList.remove('d-none'); 
        headerVideoTitle.classList.remove('d-none'); 
    }
}

/**
 * 2. 核心函数：加载视频并更新标题
 * (修改：调用 autoExpandHierarchy)
 */
function loadVideo(url, fullTitle, linkElement) {
    toggleView('player'); 
    
    headerVideoTitle.textContent = fullTitle;
    
    if (videoPlayer.src !== url) {
        videoPlayer.src = url;
        videoPlayer.load(); 
        videoPlayer.play(); 
    }
    
    // 高亮逻辑
    if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
    }
    if (linkElement) {
        linkElement.classList.add('active');
        currentActiveLink = linkElement;
    }
    
    // NEW: 播放时，左侧导航栏同步展开分级
    if (linkElement) {
        autoExpandHierarchy(linkElement);
    } else {
        // 当点击右侧列表视图中的链接时
        const sidebarLink = document.querySelector(`.section-link-sidebar[data-url="${url}"]`);
        if (sidebarLink) {
            loadVideo(url, fullTitle, sidebarLink); // 递归调用，带上 sidebarLink 进行高亮和展开
        }
    }
}


// --- 导航栏折叠/展开功能相关函数 ---

/**
 * 助手函数：创建可折叠的标题 (L1, L2, L3)
 */
function createCollapsibleHeader(title, targetId, levelClass, indentation) {
    // 使用 <a> 标签作为可点击元素，并使用 d-flex 实现图标对齐
    const header = document.createElement('a');
    header.className = `${levelClass} d-flex justify-content-between align-items-center`;
    header.setAttribute('data-bs-toggle', 'collapse');
    header.setAttribute('data-bs-target', `#${targetId}`);
    header.setAttribute('aria-expanded', 'false'); // 默认折叠
    header.style.paddingLeft = `${indentation}px`; // 应用缩进
    
    // 标题文本和折叠图标
    header.innerHTML = `
        <span>${title}</span>
        <i class="bi bi-chevron-right collapse-icon" style="margin-right: 10px;"></i>
    `;
    
    // 监听 Bootstrap 折叠事件，手动翻转图标
    const collapseElement = document.getElementById(targetId);
    if (collapseElement) {
        const icon = header.querySelector('.collapse-icon');
        collapseElement.addEventListener('show.bs.collapse', () => {
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
            header.setAttribute('aria-expanded', 'true');
        });
        collapseElement.addEventListener('hide.bs.collapse', () => {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
            header.setAttribute('aria-expanded', 'false');
        });
    }
    
    return header;
}

/**
 * 助手函数：创建折叠内容容器
 */
function createCollapsibleContent(id) {
    const content = document.createElement('div');
    content.id = id;
    content.className = 'collapse'; // 默认处于折叠状态
    return content;
}

/**
 * 4. 构建左侧永久可见的树形导航栏 (带折叠功能)
 */
function buildSidebarNavigation(data) {
    sidebarNavTree.innerHTML = '';
    uniqueIdCounter = 0; 
    
    data.forEach((semester) => {
        const L1ContentId = `collapse-l1-${uniqueIdCounter++}`;
        
        // L1 Header (学期)
        const semesterHeader = createCollapsibleHeader(semester.title, L1ContentId, 'sidebar-l1-header', 10);
        sidebarNavTree.appendChild(semesterHeader);
        
        // L1 Content Container (课程 L2)
        const L1Content = createCollapsibleContent(L1ContentId);
        
        semester.courses.forEach((course) => {
            const L2ContentId = `collapse-l2-${uniqueIdCounter++}`;

            // L2 Header (课程)
            const courseHeader = createCollapsibleHeader(course.title, L2ContentId, 'sidebar-l2-header', 20);
            L1Content.appendChild(courseHeader);

            // L2 Content Container (周 L3)
            const L2Content = createCollapsibleContent(L2ContentId);

            course.weeks.forEach((week) => {
                const L3ContentId = `collapse-l3-${uniqueIdCounter++}`;

                // L3 Header (周)
                const weekHeader = createCollapsibleHeader(week.title, L3ContentId, 'sidebar-l3-header', 30);
                L2Content.appendChild(weekHeader);

                // L3 Content Container (小节 L4)
                const L3Content = createCollapsibleContent(L3ContentId);
                L3Content.style.backgroundColor = '#1E1E1E'; // L4 容器背景

                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    
                    // L4 链接
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link-sidebar';
                    sectionLink.style.paddingLeft = '45px'; // 额外的缩进
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; 
                    sectionLink.setAttribute('data-url', section.url); 
                    // 存储父级 ID，用于自动展开
                    sectionLink.setAttribute('data-parent-l1', L1ContentId);
                    sectionLink.setAttribute('data-parent-l2', L2ContentId);
                    sectionLink.setAttribute('data-parent-l3', L3ContentId);
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink);
                    };

                    L3Content.appendChild(sectionLink);
                }); 
                
                L2Content.appendChild(L3Content); 
            }); 
            
            L1Content.appendChild(L2Content); 
        }); 
        
        sidebarNavTree.appendChild(L1Content); 
    }); 
}

/**
 * NEW: 播放视频时，自动展开对应的三级目录
 */
function autoExpandHierarchy(linkElement) {
    if (!linkElement) return;

    const L1Id = linkElement.getAttribute('data-parent-l1');
    const L2Id = linkElement.getAttribute('data-parent-l2');
    const L3Id = linkElement.getAttribute('data-parent-l3');

    // 展开 L1, L2, L3
    [L1Id, L2Id, L3Id].forEach(id => {
        const collapseElement = document.getElementById(id);
        if (collapseElement && !collapseElement.classList.contains('show')) {
            // 使用 Bootstrap JS API 展开
            const collapseInstance = new bootstrap.Collapse(collapseElement, { toggle: false });
            collapseInstance.show();
            
            // 确保父级 header 的图标同步更新
            const parentHeader = document.querySelector(`[data-bs-target="#${id}"]`);
            if (parentHeader) {
                const icon = parentHeader.querySelector('.collapse-icon');
                if (icon) {
                    icon.classList.remove('bi-chevron-right');
                    icon.classList.add('bi-chevron-down');
                }
            }
        }
    });
    
    // 确保选中的链接滚动到可视区域
    setTimeout(() => {
        linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350); // 留出时间等待折叠动画完成
}


// --- DOMContentLoaded 和 fetch 逻辑 (保持不变) ---

document.addEventListener('DOMContentLoaded', () => {
    // 初始显示列表视图
    toggleView('list'); 
    
    document.getElementById('home-link').onclick = (e) => {
        e.preventDefault();
        toggleView('list');
    };
    
    fetch('videos_index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 右侧首页列表视图（用于首页展示）
            buildListView(data); 
            // 左侧折叠导航栏（用于永久导航）
            buildSidebarNavigation(data); 
        })
        .catch(error => {
            console.error('加载 JSON 失败:', error);
            courseCatalogContainer.innerHTML = `<p class="p-5 text-danger text-center">目录加载失败: ${error.message}</p>`;
        });
});

// buildListView 逻辑与上一次保持一致，确保右侧首页列表仍能生成
function buildListView(data) {
    courseCatalogContainer.innerHTML = ''; 
    // ... (此处省略 buildListView 函数体，请保持与上一个回复中的该函数代码一致)
    if (!data || data.length === 0) {
        courseCatalogContainer.innerHTML = '<p class="p-3 text-muted">未找到视频目录数据。</p>';
        return;
    }
    
    data.forEach((semester, index1) => {
        const semesterBlock = document.createElement('div');
        semesterBlock.className = 'semester-block shadow'; 
        semesterBlock.innerHTML = `<h5 class="text-white mb-3">${semester.title}</h5>`;
        
        const tabListId = `tab-list-${index1}`;
        const tabList = document.createElement('ul');
        tabList.className = 'nav nav-tabs border-secondary mt-3 mb-3';
        tabList.id = tabListId;
        tabList.setAttribute('role', 'tablist');

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        semester.courses.forEach((course, index2) => {
            const courseTabId = `course-${index1}-${index2}`;
            const isActive = index2 === 0; 

            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.setAttribute('role', 'presentation');
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}" id="${courseTabId}-tab" data-bs-toggle="tab" data-bs-target="#${courseTabId}" type="button" role="tab" aria-controls="${courseTabId}" aria-selected="${isActive}">
                    ${course.title}
                </button>
            `;
            tabList.appendChild(tabItem);

            const courseContent = document.createElement('div');
            courseContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            courseContent.id = courseTabId;
            courseContent.setAttribute('role', 'tabpanel');
            
            const contentRow = document.createElement('div');
            contentRow.className = 'row mt-3';
            
            course.weeks.forEach((week) => {
                const weekColumn = document.createElement('div');
                weekColumn.className = 'col-lg-3 col-md-4 col-sm-6 mb-4'; 
                
                weekColumn.innerHTML = `<h6 class="week-title">${week.title}</h6>`; 
                
                const sectionList = document.createElement('ul');
                sectionList.className = 'section-list'; 
                
                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link';
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; 
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle); // 点击右侧列表时，不传 linkElement，让 loadVideo 自动在左侧查找并高亮/展开
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