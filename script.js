// 1. 获取 HTML 元素引用
const navTree = document.getElementById('video-navigation-tree');
const videoPlayer = document.getElementById('video-player');
const videoTitle = document.getElementById('current-video-title');

// 用于生成唯一的 Bootstrap Collapse ID
let uniqueIdCounter = 0;

/**
 * 2. 核心函数：加载视频并更新标题
 * @param {string} url - 视频文件的 URL
 * @param {string} title - 视频的小节标题
 */
function loadVideo(url, title) {
    if (videoPlayer.src !== url) {
        // 只有 URL 发生变化时才更新播放器
        videoPlayer.src = url;
        videoPlayer.load(); // 加载新的视频源
        videoPlayer.play(); // 自动播放
        videoTitle.textContent = title; // 更新中间区域的标题
        
        // 可选：高亮当前播放的菜单项
        document.querySelectorAll('.list-group-item.active').forEach(el => {
            el.classList.remove('active', 'fw-bold', 'text-primary');
        });
        
        // 找到被点击的链接并设置高亮 (需要处理事件源)
        // 注意：在实际前端中，通常通过事件对象 target 来实现高亮，
        // 这里为了简单，我们假设高亮逻辑在点击时处理。
    }
}


/**
 * 3. 构建导航菜单的主函数
 * @param {Array} data - 从 videos_index.json 加载的结构化数据
 */
function buildNavigation(data) {
    navTree.innerHTML = ''; // 清除 '正在加载...' 占位符

    if (!data || data.length === 0) {
        navTree.innerHTML = '<p class="p-3 text-muted">未找到视频目录数据。</p>';
        return;
    }
    
    // 遍历 L1 (学期)
    data.forEach((semester, index1) => {
        const semesterId = `collapse-s${uniqueIdCounter++}`;
        
        // L1 容器 (学期标题)
        const semesterHeader = document.createElement('div');
        semesterHeader.className = 'list-group-item bg-dark text-white fw-bold';
        semesterHeader.textContent = semester.title;
        navTree.appendChild(semesterHeader);

        // 遍历 L2 (课程)
        semester.courses.forEach((course, index2) => {
            const courseId = `collapse-c${uniqueIdCounter++}`;
            
            // L2 标题 (课程) - 作为折叠按钮
            const courseHeader = document.createElement('a');
            courseHeader.className = 'list-group-item list-group-item-action bg-light fw-semibold';
            courseHeader.setAttribute('data-bs-toggle', 'collapse');
            courseHeader.setAttribute('href', `#${courseId}`);
            courseHeader.setAttribute('aria-expanded', 'false');
            courseHeader.textContent = course.title;
            navTree.appendChild(courseHeader);

            // L3/L4 容器 (折叠内容)
            const weekContainer = document.createElement('div');
            weekContainer.id = courseId;
            weekContainer.className = 'collapse show'; // 默认展开 L2
            navTree.appendChild(weekContainer);

            // 遍历 L3 (周)
            course.weeks.forEach((week, index3) => {
                const weekId = `collapse-w${uniqueIdCounter++}`;
                
                // L3 标题 (周) - 嵌套在 L2 的折叠内容中
                const weekHeader = document.createElement('a');
                weekHeader.className = 'list-group-item list-group-item-action ps-4'; // 缩进
                weekHeader.setAttribute('data-bs-toggle', 'collapse');
                weekHeader.setAttribute('href', `#${weekId}`);
                weekHeader.textContent = week.title;
                weekContainer.appendChild(weekHeader);

                // L4 容器 (折叠内容)
                const sectionContainer = document.createElement('div');
                sectionContainer.id = weekId;
                sectionContainer.className = 'collapse show'; // 默认展开 L3
                weekContainer.appendChild(sectionContainer);

                // 遍历 L4 (小节)
                week.sections.forEach((section, index4) => {
                    // L4 链接 (小节) - 最终的可点击链接
                    const sectionLink = document.createElement('a');
                    sectionLink.className = 'list-group-item list-group-item-action ps-5'; // 进一步缩进
                    sectionLink.textContent = section.title;
                    sectionLink.href = '#'; // 防止页面跳转
                    
                    // 绑定点击事件，调用 loadVideo 函数
                    sectionLink.onclick = (e) => {
                        e.preventDefault(); // 阻止浏览器默认跳转行为
                        loadVideo(section.url, section.title);
                        
                        // 高亮当前选中的小节
                        document.querySelectorAll('.list-group-item.active').forEach(el => {
                            el.classList.remove('active', 'text-primary');
                        });
                        sectionLink.classList.add('active', 'text-primary');
                    };

                    sectionContainer.appendChild(sectionLink);
                    
                    // 默认加载第一个视频 (可选)
                    if (index1 === 0 && index2 === 0 && index3 === 0 && index4 === 0) {
                        loadVideo(section.url, section.title);
                        sectionLink.classList.add('active', 'text-primary');
                    }
                });
            });
        });
    });
}


/**
 * 4. 主执行流程：加载 JSON 数据
 */
document.addEventListener('DOMContentLoaded', () => {
    // 使用 fetch API 加载 JSON 文件
    fetch('videos_index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            buildNavigation(data);
        })
        .catch(error => {
            console.error('加载 JSON 失败:', error);
            navTree.innerHTML = `<p class="p-3 text-danger">目录加载失败: ${error.message}</p>`;
        });
});