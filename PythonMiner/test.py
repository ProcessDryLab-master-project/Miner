# import sys

# for line in sys.stdin:
#     # do something...
#     print(line)

import sys
import numpy

args1 = sys.argv[1]
args2 = sys.argv[2]
args3 = sys.argv[3]

print(args1)
print(args2)
print(args3)

# print("Hello from python", args1, args2, "The sin(arg1) and sin(arg2) is: ", numpy.sin(int(args1,10)), numpy.sin(int(args2,10)))

# logPath = "./example-log.xes"
# with open(args1) as file:
#     data = file.read()
#     print("file contents:\n", data)

sys.stdout.flush()