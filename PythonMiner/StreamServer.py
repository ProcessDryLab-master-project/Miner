# Example from: https://adyraj.medium.com/video-streaming-using-python-ed73dc5bcb30
# This code is for the server
# Lets import the libraries
import socket
import cv2
import pickle
import struct
import imutils
import keyboard
import time
import string
import random


class StreamServer():
    def startConnection(self):
        # Socket Create
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        host_name = socket.gethostname()
        host_ip = socket.gethostbyname(host_name)
        print('HOST IP:', host_ip)
        port = 9999
        socket_address = (host_ip, port)
        # Socket Bind
        server_socket.bind(socket_address)
        # Socket Listen
        server_socket.listen(5)
        print("LISTENING AT:", socket_address)
        boolTrue = True
        # Socket Accept
        while boolTrue:
            client_socket, addr = server_socket.accept()
            print('GOT CONNECTION FROM:', addr)
            if client_socket:
                counter = 0
                while boolTrue:
                    counter += 1
                    stringToSend = random.choice(string.ascii_letters)

                    client_socket.send(f"{stringToSend}".encode('utf-8'))
                    time.sleep(3)

                    if keyboard.is_pressed("q"):
                        print("CLOSING CONNECTION")
                        boolTrue = self.close()

    def close(self):
        self.server_socket.shutdown(socket.SHUT_RDWR)
        self.server_socket.close()
        print("closed")
        return False


# VIDEO STREAMING EXAMPLE
# while True:
# 	client_socket,addr = server_socket.accept()
# 	print('GOT CONNECTION FROM:',addr)
# 	if client_socket:
# 		vid = cv2.VideoCapture(0)

# 		while(vid.isOpened()):
# 			img,frame = vid.read()
# 			frame = imutils.resize(frame,width=320)
# 			a = pickle.dumps(frame)
# 			message = struct.pack("Q",len(a))+a
# 			client_socket.sendall(message)

# 			cv2.imshow('TRANSMITTING VIDEO',frame)
# 			if cv2.waitKey(1) == '13':
# 				client_socket.close()client_socket.close()
