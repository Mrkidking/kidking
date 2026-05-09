# 1. 定义空列表 lt
lt = []
print(f"1. 定义空列表: {lt}")

# 2. 向 lt 新增 5 个元素 (这里我们添加 10, 20, 30, 40, 50)
lt.extend([10, 20, 30, 40, 50])
print(f"2. 新增5个元素: {lt}")

# 3. 修改 lt 中第 2 个元素 (注意：Python 索引从 0 开始，第 2 个元素的索引是 1)
lt[1] = 22
print(f"3. 修改第2个元素: {lt}")

# 4. 向 lt 中第 2 个位置增加一个元素 (使用 insert，索引为 1)
lt.insert(1, 99)
print(f"4. 第2个位置增加元素: {lt}")

# 5. 从 lt 中第 1 个位置删除一个元素 (使用 pop 或 del，索引为 0)
lt.pop(0)
print(f"5. 删除第1个位置元素: {lt}")

# 6. 删除 lt 中第 1-3 位置元素 (使用切片删除，注意：不包含右边界)
del lt[0:3] 
print(f"6. 删除第1-3位置元素: {lt}")

# 7. 判断 lt 中是否包含数字 0
has_zero = 0 in lt
print(f"7. 是否包含数字0: {has_zero}")

# 8. 向 lt 新增数字 0
lt.append(0)
print(f"8. 新增数字0: {lt}")

# 9. 返回数字 0 所在 lt 中的索引
index_of_zero = lt.index(0)
print(f"9. 数字0的索引: {index_of_zero}")

# 10. lt 的长度
length = len(lt)
print(f"10. 列表长度: {length}")

# 11. lt 中最大元素
max_val = max(lt)
print(f"11. 最大元素: {max_val}")

# 12. 清空 lt
lt.clear()
print(f"12. 清空列表: {lt}")