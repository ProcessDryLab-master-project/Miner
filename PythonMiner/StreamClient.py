# stream code from here: https://adyraj.medium.com/video-streaming-using-python-ed73dc5bcb30
# pygraphviz installation: https://pygraphviz.github.io/documentation/stable/install.html
# pygraphviz tutorial: https://pygraphviz.github.io/documentation/pygraphviz-1.3rc1/tutorial.html
# pygraphviz reference: https://pygraphviz.github.io/documentation/pygraphviz-1.3rc1/reference/agraph.html
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
import requests


class StreamClient():
    dir_path = os.path.dirname(os.path.realpath(__file__))
    dotPath = os.path.join(dir_path, "testDot.dot")
    pngPath = os.path.join(dir_path, "testDot.png")

    dotGraph = pgv.AGraph(name="StreamGraph", strict=True, directed=True)
    dotGraph.add_node('START')
    dotGraph.add_node('END')
    version = 0
    versionCopy = version
    responseId = None

    def startConnection(self):
        # create socket
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        host_ip = '172.18.16.1'  # paste your server ip address here
        port = 9999
        client_socket.connect((host_ip, port))  # a tuple
        boolTrue = True
        numUpper = 1
        numLower = 1
        numA = 1
        # self.dotGraph.dot(open(self.dotPath, "w"))
        # render(engine='dot', format='png',
        #        filepath=self.dotPath, outfile=self.pngPath)

        self.saveDotGraph(self.dotPath)
        while boolTrue:
            received = client_socket.recv(2048).decode('utf-8')
            # print(received)
            numA, numUpper, numLower = self.stupidAlgorithm(
                received, numA, numUpper, numLower)

    def stupidAlgorithm(self, received, numA, numUpper, numLower):
        name = None
        if (received == "A" or received == "a"):
            numA += 1
            name = self.addNode("A")
        elif (received.isupper()):
            numUpper += 1
            name = self.addNode("UPPER")
        elif (received.islower()):
            numLower += 1
            name = self.addNode("LOWER")

        if (numUpper % 5 == 0 or numUpper % 5 == 0 or numUpper % 5 == 0):
            # print(f"numA: {numA}, numUpper: {numUpper}, numLower: {numLower}")
            self.version += 1  # indicate a change
            node = self.dotGraph.get_node(name)
            node.attr['color'] = 'red'

        if (self.version != self.versionCopy):  # if some change was made
            print("Changes were made")
            newPath = os.path.join(self.dir_path, f"testDot-{self.version}")
            dotPath = newPath + ".dot"
            pngPath = newPath + ".png"
            self.saveDotGraph(dotPath)
            self.drawGraph(pngPath)
            self.responseId = self.sendDotGraph(dotPath, self.responseId)
            # send the update somewhere

        self.versionCopy = self.version
        return numA, numUpper, numLower

    def sendDotGraph(self, filePath, responseId):
        url = 'https://localhost:4000/resources/'

        formData = {
            'file': open(filePath, 'rb'),
            'fileLabel': 'Streaming Dot File',
            'fileExtension': '.dot',
            'fileType': 'Visualization'
        }
        if (responseId != None):
            formData['overwriteId'] = responseId

        # headers = requests.utils.default_headers()
        # response = requests.request("POST", url, headers=headers, files=formData, verify=False)
        print("Sending formdata:")
        print(formData)
        print("File:")
        print(formData["file"])
        response = requests.post(url, files=formData, verify=False)
        print("Repository response:")
        print(response.text)
        return response.text

    def saveDotGraph(self, dotPath):
        dotGraphString = self.dotGraph.string()
        # print(dotGraphString)
        self.dotGraph.write(dotPath)
        return dotGraphString

    def drawGraph(self, pngPath):
        self.dotGraph.layout()  # default to neato.
        # dotGraph.layout(prog='dot')  # Otherwise use dot:
        self.dotGraph.draw(pngPath, format='png')

    def addNode(self, nodeName):
        if (not self.dotGraph.has_node(nodeName)):
            self.dotGraph.add_node(nodeName)
            self.dotGraph.add_edge("START", nodeName)
            self.dotGraph.add_edge(nodeName, "END")
            self.version += 1  # indicate a change
        return nodeName

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
