# From here: https://adyraj.medium.com/video-streaming-using-python-ed73dc5bcb30
import socket
import cv2
import pickle
import struct
import keyboard
import os
import sys
# import pygraphviz as pgv
from gvgen import GvGen
import graphviz as gv
from graphviz import render
import copy
import pygraphviz as pgv


class StreamClient():
    dir_path = os.path.dirname(os.path.realpath(__file__))
    dotPath = os.path.join(dir_path, "testDot.dot")
    pngPath = os.path.join(dir_path, "testDot.png")
    dotGraph = GvGen()
    dotGraph.styleAppend("BLUE", "color", "blue")
    nodeDict = {
        "START": dotGraph.newItem('START'),
        "END": dotGraph.newItem('END')
    }
    # start = dotGraph.newItem('START')
    # end = dotGraph.newItem('END')

    def startConnection(self):
        # create socket
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        host_ip = '172.18.16.1'  # paste your server ip address here
        port = 9999
        client_socket.connect((host_ip, port))  # a tuple
        boolTrue = False
        numUpper = 1
        numLower = 1
        numA = 1
        # dotGraph = GvGen()
        # dotGraph.styleAppend("BLUE", "color", "blue")
        # start = dotGraph.newItem('START')
        # end = dotGraph.newItem('END')
        # a = dotGraph.newItem("A")
        # upper = dotGraph.newItem("UPPER")
        # lower = dotGraph.newItem("LOWER")
        # dotGraph.newLink(start, a)
        # dotGraph.newLink(start, upper)
        # dotGraph.newLink(start, lower)
        # dotGraph.newLink(a, end)
        # dotGraph.newLink(upper, end)
        # dotGraph.newLink(lower, end)
        # self.dotGraph.dot()
        # dotGraph.styleAppend("BLUE", "color", "blue")
        dotGraphTemp = pickle.loads(pickle.dumps(self.dotGraph))
        # dotGraphTemp = copy.deepcopy(self.dotGraph)
        dotGraphTemp.dot()
        self.dotGraph.dot(open(self.dotPath, "w"))
        render(engine='dot', format='png',
               filepath=self.dotPath, outfile=self.pngPath)
        # file_Object = open(dotPath, "w")
        # fd = file_Object.fileno()
        # print("file descriptor:", fd)
        # os.close(fd)

        while boolTrue:
            received = client_socket.recv(2048).decode('utf-8')
            print(received)
            numA, numUpper, numLower = self.stupidAlgorithm(
                received, numA, numUpper, numLower)

    def stupidAlgorithm(self, received, numA, numUpper, numLower):
        node = None
        newPngPath = None
        print("start node: ", self.nodeDict["START"])
        print("end node: ", self.nodeDict["END"])
        if (received == "A" or received == "a"):
            numA += 1
            # node = self.dotGraph.newItem("A")
            # self.dotGraph.newLink(self.start, node)
            # self.dotGraph.newLink(node, self.end)
            node = self.addNode("A")
            newPngPath = os.path.join(self.dir_path, f"testDotA{numA}.png")
            print("nodeA: ", node)
        elif (received.isupper()):
            numUpper += 1
            # node = self.dotGraph.newItem("UPPER")
            # self.dotGraph.newLink(self.start, node)
            # self.dotGraph.newLink(node, self.end)
            node = self.addNode("UPPER")
            newPngPath = os.path.join(
                self.dir_path, f"testDotUpper{numUpper}.png")
            print("nodeUpper: ", node)
        elif (received.islower()):
            numLower += 1
            # node = self.dotGraph.newItem("LOWER")
            # self.dotGraph.newLink(self.start, node)
            # self.dotGraph.newLink(node, self.end)
            node = self.addNode("LOWER")
            newPngPath = os.path.join(
                self.dir_path, f"testDotLower{numLower}.png")
            print("nodeLower: ", node)

        if (numUpper % 5 == 0 or numUpper % 5 == 0 or numUpper % 5 == 0):
            print(f"numA: {numA}, numUpper: {numUpper}, numLower: {numLower}")
            print("Making node blue: ", node)
            self.dotGraph.styleApply("BLUE", node)

        self.dotGraph.dot()

        self.dotGraph.dot(open(self.dotPath, "w"))
        render(engine='dot', format='png',
               filepath=self.dotPath, outfile=newPngPath)

        return numA, numUpper, numLower

    def addNode(self, nodeName):
        if (nodeName not in self.nodeDict):
            node = self.dotGraph.newItem(nodeName)
            self.nodeDict[nodeName] = node
            self.dotGraph.newLink(self.nodeDict["START"], node)
            self.dotGraph.newLink(node, self.nodeDict["END"])
        return node

    def close(self):
        self.client_socket.shutdown(socket.SHUT_RDWR)
        self.client_socket.close()
        print("closed")
        return False


# create socket
# client_socket = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
# host_ip = '192.168.1.20' # paste your server ip address here
# port = 9999
# client_socket.connect((host_ip,port)) # a tuple
# data = b""
# payload_size = struct.calcsize("Q")
# while True:
# 	while len(data) < payload_size:
# 		packet = client_socket.recv(4*1024) # 4K
# 		if not packet: break
# 		data+=packet
# 	packed_msg_size = data[:payload_size]
# 	data = data[payload_size:]
# 	msg_size = struct.unpack("Q",packed_msg_size)[0]

# 	while len(data) < msg_size:
# 		data += client_socket.recv(4*1024)
# 	frame_data = data[:msg_size]
# 	data  = data[msg_size:]
# 	frame = pickle.loads(frame_data)
# 	cv2.imshow("RECEIVING VIDEO",frame)
# 	if cv2.waitKey(1) == '13':
# 		break
# client_socket.close()
