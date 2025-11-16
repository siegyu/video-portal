import os
import json
import re
import sys
import subprocess # <-- 新增导入

# --- 配置参数 ---

# Backblaze B2/Cloudflare 的 URL 前缀 (保持不变)
# 格式为: https://videos.yourdomain.com/file/mytutorial/
BASE_URL_PREFIX = "https://v.ehm84542025.site/"

# 正则表达式用于匹配文件名中的信息 (保持不变)
REGEX_SECTION = re.compile(r'(?P<course>[a-z]+)-w(?P<week>\d+)c(?P<section>\d+)\.mp4', re.IGNORECASE)
REGEX_RECAP = re.compile(r'(?P<course>[a-z]+)-w(?P<week>\d+)recap\.mp4', re.IGNORECASE)

# --- 新增：ffprobe 功能函数 ---

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
        duration_str = result.stdout.strip()
        
        # 尝试将结果转换为浮点数（秒）并四舍五入
        duration = float(duration_str)
        return round(duration) # 精确到秒后取整
        
    except FileNotFoundError:
        print("\n*** 致命错误: 'ffprobe' 未找到。***")
        print("请确保 FFmpeg 套件已安装并添加到了系统的 PATH 环境变量中。")
        print("您可以从 https://ffmpeg.org/download.html 下载。")
        sys.exit(1) # 缺少 ffprobe 是致命错误，终止脚本
    except subprocess.CalledProcessError as e:
        # 如果 ffprobe 无法处理该文件（例如文件损坏）
        print(f"警告: 无法处理文件 {file_path}。ffprobe 错误: {e.stderr.strip()}")
        return 0
    except ValueError:
        # 结果无法转换为数字
        print(f"警告: 无法从 ffprobe 输出中解析时长: {duration_str}")
        return 0

# --- 核心函数 (已修改：移除 'final' 目录限制) ---

def generate_video_index(scan_dir):
    """
    遍历指定目录，解析文件名并生成分级 JSON 结构。
    
    :param scan_dir: 要开始扫描的根目录 (例如 Z:\\term2)
    """
    
    # --- L1 结构定义 ---
    term_folder = os.path.basename(scan_dir.rstrip(os.sep))
    term_title = "第2学期" 
    
    data_by_path = {}
    
    if term_title not in data_by_path:
        data_by_path[term_title] = {"title": term_title, "courses": {}}

    current_term_courses = data_by_path[term_title]["courses"]
    
    # 遍历指定目录
    for dirpath, dirnames, filenames in os.walk(scan_dir):
        
        path_components = os.path.relpath(dirpath, scan_dir).split(os.sep)
        
        if path_components == ['.']:
            continue
            
        # 仅处理根目录下的第一级子目录作为课程目录
        if len(path_components) != 1:
            continue
            
        course_folder = path_components[0]
        
        # --- 修改开始：移除对 'final' 目录的硬性限制 ---
        # 之前的代码是:
        # if course_folder != 'final':
        #     print(f"警告：跳过非 'final' 课程目录: {course_folder}")
        #     continue
            
        # 动态生成课程标题，使用目录名
        course_title = f"课程：{course_folder}" 
        # --- 修改结束 ---
        
        if course_title not in current_term_courses:
            current_term_courses[course_title] = {"title": course_title, "weeks": {}}

        current_weeks = current_term_courses[course_title]["weeks"]

        # 处理当前目录下的所有文件
        for filename in filenames:
            if not filename.lower().endswith('.mp4'):
                continue
            
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

            # --- 新增：获取视频时长 ---
            # 构造文件的完整本地路径
            full_local_path = os.path.join(dirpath, filename)
            # 调用 ffprobe 获取时长
            duration = get_video_duration(full_local_path)
            
            # --- URL 构建 ---
            # 路径现在是 term2/course_folder/filename.mp4
            b2_path = f"{term_folder}/{course_folder}/{filename}"
            final_url = f"{BASE_URL_PREFIX}{b2_path}"

            # --- 插入数据 (新增 duration 属性) ---
            if week_num not in current_weeks:
                current_weeks[week_num] = {"title": week_title, "sections": []}
            
            current_weeks[week_num]["sections"].append({
                "title": section_title,
                "url": final_url,
                "duration": duration  # <-- 已添加时长属性
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

# --- 执行脚本 (保持不变) ---

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
        
        # 查找一个示例时长用于验证
        try:
            sample_duration = video_data[0]['courses'][0]['weeks'][0]['sections'][0]['duration']
            print(f"JSON 索引文件已成功生成: {output_file} (包含时长信息)")
            print(f"示例时长: {sample_duration} 秒")
        except (IndexError, KeyError):
            print(f"JSON 索引文件已生成: {output_file} (但未找到示例时长)")
        
    except Exception as e:
        print(f"处理过程中发生错误: {e}")
        sys.exit(1)