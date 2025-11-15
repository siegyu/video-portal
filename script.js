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
    // 假设视频 URL 类似于 https://videos.domain/path/filename.mp4
    const urlParts = videoUrl.split('/');
    const fileNameWithExt = urlParts.pop(); // e.g., filename.mp4
    
    if (!fileNameWithExt || !fileNameWithExt.endsWith('.mp4')) {
        return null;
    }
    
    // 核心修改: 替换 .mp4 为 .{langCode}.vtt
    const subtitleFileName = fileNameWithExt.replace('.mp4', `.${langCode}.vtt`);
    
    // 重建 URL
    urlParts.push(subtitleFileName);
    return urlParts.join('/');
}

// ... (toggleView and toggleIcon remain the same) ...

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

function toggleIcon(headerElement, isExpanded) {
    const icon = headerElement.querySelector('.collapse-icon');
    if (icon) {
        if (isExpanded) {
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
        } else {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
        }
    }
}


/**
 * 2. 核心函数：加载视频并更新标题 (更新: 添加字幕加载逻辑和 crossorigin)
 */
function loadVideo(url, fullTitle, linkElement) {
    toggleView('player'); 
    
    headerVideoTitle.textContent = fullTitle;
    
    if (videoPlayer.src !== url) {
        
        // ********** 核心修复：添加 crossorigin 属性 **********
        // 必须在设置 src 之前设置此属性，以便浏览器使用匿名模式处理跨域请求。
        // 这对于跨域加载字幕 (.srt) 是必需的。
        videoPlayer.crossOrigin = 'anonymous'; 
        // ******************************************************
        
        videoPlayer.src = url;
        
        // --- 字幕功能实现 ---
        // 1. 移除旧的 track 元素
        const existingTracks = videoPlayer.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());

        // 2. 构造字幕 URL
        const subtitleUrl = getSubtitleUrl(url, 'zh');
        
        if (subtitleUrl) {
            // 3. 创建并添加新的 track 元素
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = '中文';
            track.srclang = 'zh';
            track.src = subtitleUrl;
            track.default = true; 
            videoPlayer.appendChild(track);
        }
        
        videoPlayer.load(); 
        videoPlayer.play(); 
    }
    
    // 查找左侧导航栏中的对应链接
    let targetLink = linkElement;
    if (!targetLink) {
        targetLink = document.querySelector(`.section-link-sidebar[data-url="${url}"]`);
    }

    // 高亮逻辑
    if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
    }
    if (targetLink) {
        targetLink.classList.add('active');
        currentActiveLink = targetLink;
        
        autoExpandHierarchy(targetLink);
    }
}


// --- 导航栏折叠/展开功能相关函数 (保持不变) ---

function createCollapsibleHeader(title, targetId, levelClass, indentation) {
    const header = document.createElement('a');
    header.className = `${levelClass}`;
    header.setAttribute('data-bs-toggle', 'collapse');
    header.setAttribute('data-bs-target', `#${targetId}`);
    header.setAttribute('aria-expanded', 'false'); 
    header.style.paddingLeft = `${indentation}px`;
    
    header.innerHTML = `
        <span>${title}</span>
        <i class="bi bi-chevron-right collapse-icon"></i>
    `;
    return header;
}

function createCollapsibleContent(id) {
    const content = document.createElement('div');
    content.id = id;
    content.className = 'collapse'; 
    return content;
}

/**
 * 4. 构建左侧永久可见的树形导航栏 (更新: 添加时长显示)
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

                const L3Content = createCollapsibleContent(L3ContentId);
                L2Content.appendChild(L3Content);
                registerCollapseEvents(weekHeader, L3Content);
                
                week.sections.forEach((section) => {
                    const fullTitle = `${semester.title} / ${course.title} / ${week.title} / ${section.title}`;
                    
                    // --- L4 (小节链接 - 增加时长显示) ---
                    const durationText = formatDuration(section.duration);
                    
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link-sidebar';
                    sectionLink.style.paddingLeft = '55px'; 
                    // 在标题后面添加时长
                    sectionLink.innerHTML = `${section.title} <span class="duration-display">${durationText}</span>`;
                    sectionLink.href = '#'; 
                    sectionLink.setAttribute('data-url', section.url); 
                    sectionLink.setAttribute('data-parent-l1', L1ContentId);
                    sectionLink.setAttribute('data-parent-l2', L2ContentId);
                    sectionLink.setAttribute('data-parent-l3', L3ContentId);
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle, sectionLink);
                    };

                    L3Content.appendChild(sectionLink);
                }); 
            }); 
        }); 
    }); 
}

// ... (autoExpandHierarchy remains the same) ...

function autoExpandHierarchy(linkElement) {
    if (!linkElement) return;

    const L1Id = linkElement.getAttribute('data-parent-l1');
    const L2Id = linkElement.getAttribute('data-parent-l2');
    const L3Id = linkElement.getAttribute('data-parent-l3');

    [L1Id, L2Id, L3Id].forEach(id => {
        const collapseElement = document.getElementById(id);
        if (collapseElement && !collapseElement.classList.contains('show')) {
            const collapseInstance = new bootstrap.Collapse(collapseElement, { toggle: false });
            collapseInstance.show();
            
            const parentHeader = document.querySelector(`[data-bs-target="#${id}"]`);
            if (parentHeader) {
                toggleIcon(parentHeader, true);
                parentHeader.setAttribute('aria-expanded', 'true');
            }
        }
    });
    
    setTimeout(() => {
        linkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350); 
}


// --- DOMContentLoaded 和 fetch 逻辑 (保持不变) ---

document.addEventListener('DOMContentLoaded', () => {
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
            buildListView(data); 
            buildSidebarNavigation(data); 
        })
        .catch(error => {
            console.error('加载 JSON 失败:', error);
            courseCatalogContainer.innerHTML = `<p class="p-5 text-danger text-center">目录加载失败: ${error.message}</p>`;
        });
});

/**
 * buildListView 函数 (更新: 添加时长显示)
 */
function buildListView(data) {
    courseCatalogContainer.innerHTML = ''; 
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
            courseContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            courseContent.id = courseTabId;
            
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
                    const durationText = formatDuration(section.duration); // <-- 新增时长获取
                    
                    const listItem = document.createElement('li');
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'section-link';
                    // 在标题后面添加时长
                    sectionLink.innerHTML = `${section.title} <span class="duration-display">${durationText}</span>`; 
                    sectionLink.href = '#'; 
                    
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); 
                        loadVideo(section.url, fullTitle); 
                    };
                    
                    listItem.appendChild(sectionLink);
                    sectionList.appendChild(listItem);
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