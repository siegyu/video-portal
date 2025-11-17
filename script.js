// 全局变量
let videoData = [];
let currentVideoElement = null;

// 工具函数：格式化时长（秒 → HH:MM:SS 或 MM:SS）
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 工具函数：生成视频项 HTML（带 data 属性便于点击处理）
function createVideoItem(semester, course, week, video, isFullList = false) {
  const { title, duration, mp4_url } = video;
  const durationStr = duration ? formatDuration(duration) : '?';
  const key = `${semester}/${course}/${week}/${title}`;
  const cls = isFullList ? 'video-item' : 'nav-list-item';
  return `
    <div class="${cls}" 
         data-semester="${encodeURIComponent(semester)}"
         data-course="${encodeURIComponent(course)}"
         data-week="${encodeURIComponent(week)}"
         data-title="${encodeURIComponent(title)}"
         data-mp4="${mp4_url}"
         data-vtt="${video.vtt_url || ''}"
         data-desc="${video.description || ''}"
         title="${title} (${durationStr})">
      ${title} <span style="color:#777; font-size:0.85em;">${durationStr}</span>
    </div>`;
}

// 渲染左侧导航（按学期 → 课程 → 周）
function renderCourseNav(data) {
  let navHtml = '';
  for (const [semester, courses] of Object.entries(data)) {
    navHtml += `<div class="nav-section"><h3>${semester}</h3>`;
    for (const [course, weeks] of Object.entries(courses)) {
      navHtml += `<div class="course-group"><h4>${course}</h4><ul class="nav-list">`;
      for (const [week, videos] of Object.entries(weeks)) {
        videos.forEach(video => {
          navHtml += `<li>${createVideoItem(semester, course, week, video)}</li>`;
        });
      }
      navHtml += `</ul></div>`;
    }
    navHtml += `</div>`;
  }
  document.getElementById('courseNav').innerHTML = navHtml;
}

// 渲染完整列表（课程分组，便于浏览）
function renderFullList(data) {
  let listHtml = '';
  for (const [semester, courses] of Object.entries(data)) {
    listHtml += `<div class="course-group"><h3>${semester}</h3>`;
    for (const [course, weeks] of Object.entries(courses)) {
      listHtml += `<div class="week-section"><h4>${course}</h4>`;
      for (const [week, videos] of Object.entries(weeks)) {
        listHtml += `<div class="week-title">${week}</div>`;
        videos.forEach(video => {
          listHtml += createVideoItem(semester, course, week, video, true);
        });
      }
      listHtml += `</div>`;
    }
    listHtml += `</div>`;
  }
  document.getElementById('fullList').innerHTML = listHtml;
}

// 播放指定视频
function playVideo(semester, course, week, title, mp4Url, vttUrl, description) {
  const videoPlayer = document.getElementById('videoPlayer');
  const videoTitle = document.getElementById('videoTitle');
  const videoDesc = document.getElementById('videoDescription');
  const currentPlayback = document.getElementById('currentPlayback');

  // 清除之前的 active 状态
  if (currentVideoElement) {
    currentVideoElement.classList.remove('active');
  }

  // 更新播放器
  videoPlayer.src = mp4Url;
  videoPlayer.innerHTML = ''; // 清空旧字幕 track
  if (vttUrl) {
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = '中文';
    track.srclang = 'zh';
    track.src = vttUrl;
    track.default = true;
    videoPlayer.appendChild(track);
  }
  videoPlayer.load();
  videoPlayer.play().catch(e => console.warn('自动播放被阻止:', e));

  // 更新信息
  videoTitle.textContent = title;
  videoDesc.textContent = description || '暂无描述';
  currentPlayback.textContent = `当前播放：${semester} → ${course} → ${week} → ${title}`;

  // 查找并高亮所有匹配的 video-item（左侧+完整列表）
  const selector = [
    `[data-semester="${encodeURIComponent(semester)}"]`,
    `[data-course="${encodeURIComponent(course)}"]`,
    `[data-week="${encodeURIComponent(week)}"]`,
    `[data-title="${encodeURIComponent(title)}"]`
  ].join('');
  
  const items = document.querySelectorAll(selector);
  items.forEach(el => el.classList.add('active'));
  currentVideoElement = items[0]; // 保留一个用于下次清除
}

// 点击代理：处理所有 video-item 点击
document.addEventListener('click', function (e) {
  const item = e.target.closest('.video-item, .nav-list-item');
  if (!item) return;

  const semester = decodeURIComponent(item.dataset.semester);
  const course = decodeURIComponent(item.dataset.course);
  const week = decodeURIComponent(item.dataset.week);
  const title = decodeURIComponent(item.dataset.title);
  const mp4Url = item.dataset.mp4;
  const vttUrl = item.dataset.vtt || '';
  const description = decodeURIComponent(item.dataset.desc || '');

  playVideo(semester, course, week, title, mp4Url, vttUrl, description);
});

// 初始化：加载 JSON 数据
fetch('videos_index.json')
  .then(response => response.json())
  .then(data => {
    videoData = data;
    renderCourseNav(data);
    renderFullList(data);
  })
  .catch(err => {
    console.error('加载 videos_index.json 失败:', err);
    document.getElementById('courseNav').textContent = '❌ 加载失败';
    document.getElementById('fullList').textContent = '❌ 加载失败';
  });