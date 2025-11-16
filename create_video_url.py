import os
import json
import re
import sys
import subprocess # <-- 新增导入

# --- 配置参数 ---

# Backblaze B2/Cloudflare 的 URL 前缀 (保持不变)
BASE_URL_PREFIX = "https://v.ehm84542025.site/term2/"

# --- 核心修改：新的正则表达式，忽略前缀，只匹配周和小节 ---
# 旧的: r'(?P<course>[a-z]+)-w(?P<week>\d+)c(?P<section>\d+)\.mp4'
# 新的: 使用 .*?- 匹配并忽略所有前缀（包括含有 - 的课程名），直到 w\d+
REGEX_SECTION = re.compile(r'.*?-w(?P<week>\d+)c(?P<section>\d+)\.mp4$', re.IGNORECASE)

# 旧的: r'(?P<course>[a-z]+)-w(?P<week>\d+)recap\.mp4'
# 新的: 使用 .*?- 匹配并忽略所有前缀，直到 w\d+recap
REGEX_RECAP = re.compile(r'.*?-w(?P<week>\d+)recap\.mp4$', re.IGNORECASE)

# --- 新增：ffprobe 功能函数 (保持不变) ---

def get_video_duration(file_path):
    """
    使用 ffprobe 获取视频文件的精确时长（秒）。
    如果获取失败，返回 0。
    """
    if not os.path.exists(file_path):
        print(f"警告：文件路径不存在: {file_path}")
        return 0
    
    try:
        # ffprobe 命令，以 JSON 格式输出视频流的时长信息
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            file_path
        ]
        
        # 运行命令并捕获输出
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, encoding='utf-8')
        duration = float(result.stdout.strip())
        return int(round(duration))
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError) as e:
        print(f"警告：无法使用 ffprobe 获取 {file_path} 的时长。错误: {e}")
        return 0


# --- 核心函数 ---

def generate_video_index(scan_dir):
    """
    遍历指定目录，解析文件名并生成分级 JSON 结构。
    
    :param scan_dir: 要开始扫描的根目录 (例如 Z:\\term2)
    """
    
    # --- L1 结构定义 ---
    # L1 文件夹名 (e.g., 'term2')
    term_folder = os.path.basename(scan_dir.rstrip(os.sep))
    # L1 结构标题 (根据需求硬编码)
    term_title = "第2学期" # 假设输入 Z:\term2
    
    # 结构构建字典
    data_by_path = {}
    
    # 遍历目录
    for root, _, files in os.walk(scan_dir):
        # 计算相对路径，用于生成 URL
        relative_path = os.path.relpath(root, scan_dir).replace('\\', '/')
        
        # 确保根目录自身被处理
        if relative_path == '.':
            relative_path = os.path.basename(scan_dir.rstrip(os.sep))
        
        # --- L1: Term / 学期 ---
        term_key = os.path.join(scan_dir, term_folder)
        if term_key not in data_by_path:
            data_by_path[term_key] = {
                "title": term_title,
                "courses": {} # 键为 course_key (e.g., 'term2/courseA')
            }

        # --- L2: Course / 课程 ---
        # 课程名称通常是 term 文件夹下的第一级子目录名 (e.g., 'final')
        path_parts = relative_path.split('/')
        course_name = path_parts[0] if path_parts and path_parts[0] else 'default'
        
        course_key = os.path.join(term_folder, course_name)
        
        if course_key not in data_by_path[term_key]['courses']:
            data_by_path[term_key]['courses'][course_key] = {
                "title": f"课程：{course_name}",
                "weeks": {} # 键为 week_number (e.g., '7')
            }
        
        course_data = data_by_path[term_key]['courses'][course_key]
        
        for filename in files:
            if not filename.endswith('.mp4'):
                continue
            
            full_path = os.path.join(root, filename)
            url_path = os.path.join(relative_path, filename).replace('\\', '/')
            final_url = BASE_URL_PREFIX + url_path
            
            section_match = REGEX_SECTION.match(filename)
            recap_match = REGEX_RECAP.match(filename)
            
            week_number = None
            section_title = None
            
            if section_match:
                week_number = int(section_match.group('week'))
                section_number = int(section_match.group('section'))
                section_title = f"第{section_number}小节"
                
            elif recap_match:
                week_number = int(recap_match.group('week'))
                section_title = "回顾总结"
                
            if week_number is not None:
                week_key = str(week_number)
                
                if week_key not in course_data['weeks']:
                    course_data['weeks'][week_key] = {
                        "title": f"第{week_number}周",
                        "sections": []
                    }
                
                # 获取时长
                duration_sec = get_video_duration(full_path)
                
                course_data['weeks'][week_key]['sections'].append({
                    "title": section_title,
                    "url": final_url,
                    "duration": duration_sec
                })
    
    # --- 整理输出格式 (修改为同时排序 weeks 和 sections) ---
    final_output_list = []
    
    for term_key, term_data in data_by_path.items():
        term_data['courses'] = list(term_data['courses'].values())
        
        for course_data in term_data['courses']:
            # 1. 确保 weeks 按数字顺序排列
            sorted_weeks = sorted(course_data['weeks'].items(), key=lambda item: int(item[0])) # 确保按周数字排序
            course_data['weeks'] = []
            
            for week_index, week_data in sorted_weeks:
                
                # 2. 针对每个 week 的 sections 进行排序 (核心修复)
                def sort_sections(section):
                    title = section['title']
                    if '回顾总结' in title:
                        # '回顾总结' 始终排在最后（使用一个非常大的数字作为键）
                        return 9999
                    # 尝试从标题中提取小节号 (例如 "第X小节")
                    match = re.search(r'第(\d+)小节', title)
                    if match:
                        return int(match.group(1))
                    # 无法识别的按字母顺序
                    return title
                
                # 对 sections 列表进行排序
                week_data['sections'].sort(key=sort_sections)
                course_data['weeks'].append(week_data)
                
        final_output_list.append(term_data)
        
    return final_output_list

# --- 执行脚本 (保持不变) ---

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("错误：请指定要扫描的起始目录。")
        print("用法示例：python create_video_url.py Z:\\term2")
        sys.exit(1)
        
    input_dir = sys.argv[1]
    
    if not os.path.isdir(input_dir):
        print(f"错误：指定的目录 {input_dir} 不存在。")
        sys.exit(1)
    
    print(f"开始扫描目录: {input_dir}...")
    
    try:
        video_data = generate_video_index(input_dir)
        
        output_file = 'videos_index.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(video_data, f, ensure_ascii=False, indent=4)
        
        print(f"成功创建视频索引文件: {output_file}")
        
    except Exception as e:
        print(f"发生致命错误: {e}")
        sys.exit(1)