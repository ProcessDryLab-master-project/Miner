# From here: https://adyraj.medium.com/video-streaming-using-python-ed73dc5bcb30
import socket,cv2, pickle,struct,keyboard,os
# import pygraphviz as pgv
from gvgen import GvGen
import graphviz as gv

class StreamClient():
	dir_path = os.path.dirname(os.path.realpath(__file__))
	def startConnection(self):
		# create socket
		client_socket = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
		client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
		host_ip = '172.18.16.1' # paste your server ip address here
		port = 9999
		client_socket.connect((host_ip,port)) # a tuple
		boolTrue = True
		test = 0
		numUpper = 0
		numLower = 0
		numA = 0
		dotGraph=GvGen()
		start = dotGraph.newItem('START')
		end = dotGraph.newItem('END')
		a = dotGraph.newItem("A")
		upper = dotGraph.newItem("UPPER")
		lower = dotGraph.newItem("LOWER")
		dotGraph.newLink(start, a)
		dotGraph.newLink(start, upper)
		dotGraph.newLink(start, lower)
		dotGraph.newLink(a, end)
		dotGraph.newLink(upper, end)
		dotGraph.newLink(lower, end)

		# dotGraph.styleAppend("BLUE", "color", "blue")
		dotPath = os.path.join(self.dir_path, "testDot.dot")
		# output = dotGraph.dot()
		# print(output)
		with open(dotPath, 'wb') as file:
			pickle.dump(dotGraph.dot(), file)
			print(f'Object successfully saved to "{dotPath}"')

		while boolTrue:
			test += 1
			received = client_socket.recv(2048).decode('utf-8')
			print(received)
			self.stupidAlgorithm(received, numUpper, numLower, numA, dotGraph, upper)


	def stupidAlgorithm(self, received, numUpper, numLower, numA, dotGraph, upper):
		if(received == "A" or received == "a"):
			# dotGraph.styleApply("A")
			numA += 1
		elif(received.isupper()):
			# dotGraph.newItem("UPPER")
			numUpper += 1
		elif(received.islower()):
			# dotGraph.newItem("LOWER")
			numLower += 1
		
		# if(numUpper%5==0):
		# 	dotGraph.styleApply("BLUE", upper)
		# 	with open("test.txt", 'w', buffering=20*(1024**2)) as myfile:
		# 		for line in mydata:
		# 			myfile.write(line + '\n')
		# dotGraph.dot()
		# print(dotGraph)
		

	def close(self):
		self.client_socket.shutdown(socket.SHUT_RDWR)
		self.client_socket.close()
		print ("closed")
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