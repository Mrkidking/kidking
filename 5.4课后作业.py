def is_valid_float(s: str) -> bool:
    """
    判断字符串s是否表示一个合法的实型浮点数（float）。
    支持：正负号、小数点、科学计数法（e/E）。
    """
    try:
        float(s)
        return True
    except ValueError:
        return False

# 测试示例
if __name__ == "__main__":
    test_cases = ["3.14", "-2.5", "+1.0", "0", ".5", "1e3", "2.5E-2", "abc", "1.2.3", ""]
    for case in test_cases:
        print(f"'{case}': {is_valid_float(case)}")