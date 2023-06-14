# Mqtt medium guide: https://medium.com/python-point/mqtt-basics-with-python-examples-7c758e605d4
# Can create another publisher by copying everything from this file and only changing clientName
# Run with command: py .\MqttPublisher1.py
import paho.mqtt.client as mqtt
from random import randrange, uniform, choice
import string
import os
import json
import sys
import time
import urllib3
import uuid
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)

        output = body["Output"]
        streamOutputHost = output["Host"]
        eprint("streamOutputHost: ", streamOutputHost)
        streamOutputTopic = output["StreamTopic"]

        firstPrint = True


        clientPublisherName = str(uuid.uuid4())
        clientPublisher = mqtt.Client(clientPublisherName)
        clientPublisher.connect(streamOutputHost)
        
        while True:
            stringToSend = choice(string.ascii_letters)
            clientPublisher.publish(streamOutputTopic, stringToSend)
            if(firstPrint): # We only print once for publishers, since we just need to send metainfo to Repository once.
                print("STREAM")
                firstPrint = False
                sys.stdout.flush()
            
            eprint(f"Just published {stringToSend} to topic {streamOutputTopic}")

            time.sleep(1)
