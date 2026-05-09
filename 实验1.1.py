import time
import math
#常数N
N=2*math.sqrt(2)/9801
#循环累加的和
sum=0
#循环次数
n=1100
#开始计时间
start=time.time()
for k in range(n):
    #计算分子
    a=math.factorial(4*k)*(1103+26390*k)
    #计算分母
    b=(math.factorial(k)**4)*(396**(4*k))
    #计算当前值
    item=a/b
    #累加到总和
    sum=sum+item
#计算π
pi=1/(N*sum)
end=time.time()
print("π的值为:",pi)
print("计算时间为:",(end-start)*1000,"毫秒")