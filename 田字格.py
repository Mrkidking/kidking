horizontal = "+ - - - - + - - - - +"
vertical = "|         |         |"
# 循环输出
def draw_grid():
    # 第一行横线
    print(horizontal)
    # 第一层纵线（通常4行）
    for _ in range(4):
        print(vertical)
    # 中间横线
    print(horizontal)
    # 第二层纵线
    for _ in range(4):
        print(vertical)
    # 最后一行横线
    print(horizontal)

draw_grid()