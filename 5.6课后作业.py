def sum_of_strings(a: str, b: str):
    """
    接收两个字符串，若均为合法浮点数，返回它们的和（float）；
    否则返回错误信息。
    """
    try:
        val_a = float(a)
        val_b = float(b)
        return val_a + val_b
    except ValueError:
        return "Error: 输入包含非法的数字字符串"

# 测试示例
if __name__ == "__main__":
    print(sum_of_strings("3.14", "2.86"))    # 输出 6.0
    print(sum_of_strings("-1.5", "2.5"))     # 输出 1.0
    print(sum_of_strings("1e2", "0.5"))      # 输出 100.5
    print(sum_of_strings("abc", "123"))      # 输出 Error...
    print(sum_of_strings("12.3", "xyz"))     # 输出 Error...