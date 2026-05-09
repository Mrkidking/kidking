def count_characters():
    # 从键盘获取输入
    user_input = input("请输入一行字符：")
    
    # 初始化计数器
    english_count = 0
    digit_count = 0
    space_count = 0
    other_count = 0
    
    # 遍历字符串中的每一个字符
    for char in user_input:
        if char.isalpha():        # 判断是否为英文字符（包括中文在内的字母类字符）
            english_count += 1
        elif char.isdigit():      # 判断是否为数字
            digit_count += 1
        elif char.isspace():      # 判断是否为空格
            space_count += 1
        else:                     # 其他字符
            other_count += 1
            
    # 输出结果
    print(f"英文字符个数: {english_count}")
    print(f"数字个数: {digit_count}")
    print(f"空格个数: {space_count}")
    print(f"其他字符个数: {other_count}")

# 运行函数
if __name__ == "__main__":
    count_characters()