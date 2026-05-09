# 获取用户输入
num_str = input("请输入一个5位数字: ")
if num_str == num_str[::-1]:
    print(f"{num_str} 是回文数。")
else:
    print(f"{num_str} 不是回文数。")