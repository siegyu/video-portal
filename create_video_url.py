import os
import json
import re
import sys

# --- 配置参数 ---

# Backblaze B2/Cloudflare 的 URL 前缀 (保持不变)
# 格式为: https://videos.yourdomain.com/file/mytutorial/
BASE_URL_PREFIX = "https://videos.yourdomain.com/file/mytutorial/"

# 正则表达式用于匹配文件名中的信息 (保持不变)
REGEX_SECTION = re.compile(r'(?P<course>[a-z]+)-w(?P<week>\d+)c(?P<section>\d+)\.mp4', re.IGNORECASE)
REGEX_RECAP = re.compile(r'(?P<course>[a-z]+)-w(?P<week>\d+)recap\.mp4', re.IGNORECASE)

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
    
    # L1 和 L2 结构初始化 (我们知道这是我们正在扫描的唯一学期和课程)
    if term_title not in data_by_path:
        data_by_path[term_title] = {"title": term_title, "courses": {}}

    current_term_courses = data_by_path[term_title]["courses"]
    
    # 遍历指定目录
    for dirpath, dirnames, filenames in os.walk(scan_dir):
        
        # 将目录路径拆分为组件 (相对于扫描根目录)
        path_components = os.path.relpath(dirpath, scan_dir).split(os.sep)
        
        # 1. 忽略起始目录本身 (相对路径为 '.')
        if path_components == ['.']:
            continue
            
        # 2. 我们只关心符合 'final' 这一层的文件，所以相对路径只有一级目录
        if len(path_components) != 1:
            # 如果文件结构更深 (如 Z:\term2\final\week14\final-w14c0.mp4)，
            # 这里需要调整逻辑来处理 L3 目录。但目前根据您的描述 L3/L4 信息都在文件名中，L2 是 'final'
            continue
            
        course_folder = path_components[0]
        
        # --- L2 结构定义 ---
        # L2 标题的硬编码映射 (根据需求)
        if course_folder != 'final':
            print(f"警告：跳过非 'final' 课程目录: {course_folder}")
            continue
            
        course_title = "课程：final"
        
        if course_title not in current_term_courses:
            current_term_courses[course_title] = {"title": course_title, "weeks": {}}

        current_weeks = current_term_courses[course_title]["weeks"]

        # 处理当前目录下的所有文件
        for filename in filenames:
            if not filename.lower().endswith('.mp4'):
                continue
            
            # 尝试匹配小节或回顾
            match_section = REGEX_SECTION.match(filename)
            match_recap = REGEX_RECAP.match(filename)
            
            # --- L3/L4 信息提取 ---
            if match_section:
                groups = match_section.groupdict()
                week_num = int(groups['week'])
                section_num = int(groups['section'])
                
                week_title = f"第{week_num}周" # L3
                section_title = f"第{section_num}小节" # L4
                
            elif match_recap:
                groups = match_recap.groupdict()
                week_num = int(groups['week'])
                
                week_title = f"第{week_num}周" # L3
                section_title = "回顾总结" # L4 (特殊情况)
                
            else:
                print(f"警告：跳过无法解析的文件名: {filename}")
                continue
            
            # --- URL 构建 ---
            # B2 路径是 L1/L2/文件名 (e.g., term2/final/final-w7c0.mp4)
            b2_path = f"{term_folder}/{course_folder}/{filename}"
            final_url = f"{BASE_URL_PREFIX}{b2_path}"

            # --- 插入数据 ---
            if week_num not in current_weeks:
                current_weeks[week_num] = {"title": week_title, "sections": []}
            
            current_weeks[week_num]["sections"].append({
                "title": section_title,
                "url": final_url
            })
    
    # --- 整理输出格式 (保持不变) ---
    final_output_list = []
    
    for term_key, term_data in data_by_path.items():
        term_data['courses'] = list(term_data['courses'].values())
        
        for course_data in term_data['courses']:
            sorted_weeks = sorted(course_data['weeks'].items())
            course_data['weeks'] = [item[1] for item in sorted_weeks]
            
        final_output_list.append(term_data)
        
    return final_output_list

# --- 执行脚本 (修改为接收命令行参数) ---

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("错误：请指定要扫描的起始目录。")
        print("用法示例：python script_name.py Z:\\term2")
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
        
        total_sections = sum(len(w['sections']) for c in video_data[0]['courses'] for w in c['weeks'])
        print(f"JSON 索引文件已成功生成: {output_file}")
        print(f"总计找到 {total_sections} 个视频小节。")
        
    except Exception as e:
        print(f"处理过程中发生错误: {e}")
        sys.exit(1)