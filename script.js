// 1. 获取 HTML 元素引用
const sidebarNavTree = document.getElementById('video-navigation-tree'); 
const listView = document.getElementById('list-view'); 
const playerView = document.getElementById('player-view'); 
const headerVideoTitle = document.getElementById('header-video-title'); 
const videoPlayer = document.getElementById('video-player');
const toggleListBtn = document.getElementById('toggle-list-btn'); 
const courseCatalogContainer = document.getElementById('course-catalog-container'); 

let currentActiveLink = null; 
let uniqueIdCounter = 0; 

/**
 * Helper function: 格式化时长 (秒 -> MM:SS)
 */
function formatDuration(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) {
        return '';
    }
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');
    
    return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Helper function: 根据视频 URL 推导字幕 URL (更新为 VTT 格式)
 */
function getSubtitleUrl(videoUrl, langCode = 'zh') {
    if (!videoUrl) return null;
    const baseName = videoUrl.substring(0, videoUrl.lastIndexOf('.'));
    return `${baseName}.${langCode}.vtt`;
}

/**
 * Helper function: 切换列表/播放器视图 (已修复BUG)
 * * 错误原因：index.html 使用 d-none/d-block !important 类。
 * 旧的 toggleView 使用 style.display，优先级不够，无法覆盖 !important。
 * 解决方案：使用 classList.remove/add 来切换 Bootstrap 类。
 */
function toggleView(showList) {
    if (showList) {
        // 切换到列表视图
        listView.classList.remove('d-none');
        listView.classList.add('d-block');
        
        playerView.classList.remove('d-flex'); // player-view 使用 d-flex (来自 styles.css)
        playerView.classList.add('d-none');

        // 在列表视图中，隐藏“完整列表”按钮
        toggleListBtn.classList.add('d-none');
        
        // 在列表视图中，隐藏顶部的“当前播放”标题
        headerVideoTitle.classList.add('d-none');
        
    } else {
        // 切换到播放器视图
        listView.classList.remove('d-block');
        listView.classList.add('d-none');
        
        playerView.classList.remove('d-none');
        playerView.classList.add('d-flex'); // player-view 布局在 styles.css 中定义为 flex

        // 在播放器视图中，显示“完整列表”按钮
        toggleListBtn.classList.remove('d-none');
        
        // 在播放器视图中，显示顶部的“当前播放”标题 (loadVideo会填充内容)
        headerVideoTitle.classList.remove('d-none');
    }
}


/**
 * Helper function: 切换折叠图标
 */
function toggleIcon(header, isExpanded) {
    const icon = header.querySelector('.collapse-icon');
    if (icon) {
        // 使用 CSS transform 实现平滑旋转
        icon.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

/**
 * 核心函数: 加载视频到播放器
 */
function loadVideo(videoUrl, title, clickedLink) {
    // 1. 切换到播放器视图 (确保这是第一步)
    toggleView(false); // <--- 此函数现在可以正常工作
    
    // 2. 更新头部标题
    headerVideoTitle.textContent = title;
    
    // 3. 更新视频源
    if (videoPlayer.src !== videoUrl) {
        // 必须设置 crossorigin="anonymous" 以便跨域加载 VTT 字幕
        videoPlayer.crossOrigin = 'anonymous'; 
        videoPlayer.src = videoUrl;
        
        // 4. 清理旧字幕和添加新字幕
        while (videoPlayer.firstChild) {
            videoPlayer.removeChild(videoPlayer.firstChild);
        }

        const subtitleUrl = getSubtitleUrl(videoUrl);
        if (subtitleUrl) {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = '中文';
            track.srclang = 'zh';
            track.src = subtitleUrl;
            track.default = true; // 默认启用字幕
            videoPlayer.appendChild(track);
        }
        
        // 5. 重新加载和播放
        videoPlayer.load();
    }
    videoPlayer.play();
    
    // 6. 更新激活链接状态
    if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
    }
    // L4 链接在侧边栏和列表视图中使用不同的类名，兼容处理
    if (clickedLink) {
        clickedLink.classList.add('active');
        currentActiveLink = clickedLink;
    }
}

/**
 * Helper function: 创建可折叠头部
 */
function createCollapsibleHeader(title, targetId, className, paddingLeft) {
    const header = document.createElement('a');
    header.className = `btn btn-link text-start w-100 p-0 ${className} collapsed`;
    header.setAttribute('data-bs-toggle', 'collapse');
    header.setAttribute('data-bs-target', `#${targetId}`);
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', targetId);
    header.style.paddingLeft = `${paddingLeft}px`; 
    
    // 使用 span 包裹标题文本
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    header.appendChild(titleSpan);

    const icon = document.createElement('span');
    icon.className = 'collapse-icon bi bi-chevron-right'; 
    icon.innerHTML = '▶'; // 使用简单的箭头字符
    header.appendChild(icon);
    
    return header;
}

/**
 * Helper function: 创建可折叠内容容器
 */
function createCollapsibleContent(id) {
    const content = document.createElement('div');
    content.id = id;
    content.className = 'collapse'; 
    return content;
}


/**
 * 4. 构建左侧永久可见的树形导航栏 (侧边栏)
 */
function buildSidebarNavigation(data) {
    sidebarNavTree.innerHTML = ''; 
    uniqueIdCounter = 0; 
    
    function registerCollapseEvents(header, collapseElement) {
        collapseElement.addEventListener('show.bs.collapse', () => {
            toggleIcon(header, true);
        });
        collapseElement.addEventListener('hide.bs.collapse', () => {
            toggleIcon(header, false);
        });
    }

    data.forEach((semester) => {
        const L1ContentId = `collapse-l1-${uniqueIdCounter++}`;
        
        // L1
        const semesterHeader = createCollapsibleHeader(semester.title, L1ContentId, 'sidebar-l1-header', 10);
        sidebarNavTree.appendChild(semesterHeader);
        
        const L1Content = createCollapsibleContent(L1ContentId);
        sidebarNavTree.appendChild(L1Content);
        registerCollapseEvents(semesterHeader, L1Content); 

        semester.courses.forEach((course) => {
            const L2ContentId = `collapse-l2-${uniqueIdCounter++}`;

            // L2
            const courseHeader = createCollapsibleHeader(course.title, L2ContentId, 'sidebar-l2-header', 25);
            L1Content.appendChild(courseHeader);
            
            const L2Content = createCollapsibleContent(L2ContentId);
            L1Content.appendChild(L2Content);
            registerCollapseEvents(courseHeader, L2Content);

            course.weeks.forEach((week) => {
                const L3ContentId = `collapse-l3-${uniqueIdCounter++}`;

                // L3
                const weekHeader = createCollapsibleHeader(week.title, L3ContentId, 'sidebar-l3-header', 40);
                L2Content.appendChild(weekHeader);

                // 核心修复: 阻止 L3 (周标题) 的点击事件向上冒泡。
                weekHeader.addEventListener('click', function(e) {
                    e.stopPropagation(); 
                });

                const L3Content = createCollapsibleContent(L3ContentId);
                L2Content.appendChild(L3Content);
                registerCollapseEvents(weekHeader, L3Content);
                
                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    const durationText = formatDuration(section.duration);

                    // --- L4 (小节链接 - 侧边栏) ---
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link-sidebar'; // 使用侧边栏专用类
                    sectionLink.href = '#'; 
                    sectionLink.innerHTML = `${section.title} <span class="duration-display">${durationText}</span>`; 
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink);
                        // 移除多余的 toggleView(false) 调用，因为 loadVideo 内部会处理
                    };

                    L3Content.appendChild(sectionLink);
                }); 
            }); 
        }); 
    }); 
}

/**
 * Helper function: 自动展开当前视频所在的层级 (暂略)
 */
function autoExpandHierarchy(url, data) {
    if (!url || !data) return;

    // 略过细节实现
}

/**
 * 5. 构建右侧课程目录视图 (初始页 - ListView)
 */
function buildListView(data) {
    courseCatalogContainer.innerHTML = ''; 
    if (!data || data.length === 0) {
        courseCatalogContainer.innerHTML = '<p class="p-3 text-muted">未找到视频目录数据。</p>';
        return;
    }
    
    data.forEach((semester, index1) => {
        const semesterBlock = document.createElement('div');
        semesterBlock.className = 'semester-block shadow mb-5 p-4';
        semesterBlock.innerHTML = `<h5 class="text-white mb-3">${semester.title}</h5>`;
        
        const tabListId = `tab-list-${index1}`;
        const tabList = document.createElement('ul');
        tabList.className = 'nav nav-tabs border-secondary mt-3 mb-3';
        tabList.id = tabListId;

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        semester.courses.forEach((course, index2) => {
            const courseTabId = `course-${index1}-${index2}`;
            const isActive = index2 === 0; 

            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}" id="${courseTabId}-tab" data-bs-toggle="tab" data-bs-target="#${courseTabId}" type="button" role="tab" aria-controls="${courseTabId}" aria-selected="${isActive}">
                    ${course.title}
                </button>
            `;
            tabList.appendChild(tabItem);

            const courseContent = document.createElement('div');
            courseContent.className = `tab-pane fade ${isActive ? 'show active' : ''} course-catalog-content`;
            courseContent.id = courseTabId;
            
            // --- L3 周标题 (纵向) 和 L4 小节 (紧凑区块) ---
            
            course.weeks.forEach((week) => {
                // L3 周区块
                const weekBlock = document.createElement('div');
                weekBlock.className = 'week-block mb-4'; 
                
                // L3 周标题 (纵向排列)
                weekBlock.innerHTML = `<h6 class="week-title">${week.title}</h6>`; 
                
                // L4 小节列表容器 (Flex 容器，用于尾随式紧凑排列)
                const sectionList = document.createElement('div'); 
                sectionList.className = 'section-list'; 
                
                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    const durationText = formatDuration(section.duration); 
                    
                    // L4 小节链接 (区块)
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link'; 
                    sectionLink.href = '#'; 
                    
                    // 内部结构: 小节名称 + 时长
                    sectionLink.innerHTML = `
                        <span class="section-title-text">${section.title}</span> 
                        <span class="duration-display">${durationText}</span>
                    `; 
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink); // 传递链接以便更新 active 状态
                        // 移除多余的 toggleView(false) 调用，因为 loadVideo 内部会处理
                    };
                    
                    sectionList.appendChild(sectionLink);
                });
                
                weekBlock.appendChild(sectionList);
                courseContent.appendChild(weekBlock);
            });
            
            tabContent.appendChild(courseContent);
        });

        semesterBlock.appendChild(tabList);
        semesterBlock.appendChild(tabContent);
        courseCatalogContainer.appendChild(semesterBlock);
    });
}


/**
 * 6. DOM 内容加载完成后执行
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. 加载数据
    fetch('videos_index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 2. 构建导航和列表视图
            if (data && data.length > 0) {
                // Sidebar Navigation
                buildSidebarNavigation(data);
                
                // Course Catalog List View
                buildListView(data);
                
                // 默认显示目录列表
                toggleView(true);
            }
        })
        .catch(error => {
            console.error("加载视频索引文件失败:", error);
            courseCatalogContainer.innerHTML = `<p class="p-3 text-danger">错误：无法加载视频目录数据。请检查 'videos_index.json' 文件和网络连接。 (${error.message})</p>`;
        });

    // 3. 切换视图按钮事件 (修复: 确保 onclick 事件在 HTML 之外定义)
    
    // 从 index.html 移除 onclick="toggleView('list')"
    // 我们在这里绑定正确的事件
    document.getElementById('home-link').addEventListener('click', (e) => {
        e.preventDefault();
        toggleView(true);
    });

    toggleListBtn.addEventListener('click', () => {
        // 按钮“完整列表” 的作用始终是返回列表视图
        toggleView(true);
    });
    
    // 4. 初始化视图
    toggleView(true);
});