# pip install requests
# pip install paho-mqtt
import paho.mqtt.client as mqtt
import time
import os
import json
import sys
import time
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

result_folder = './Tmp'
# Global variables that probably shouldn't be!

global alphabetList, streamOutputHost, streamInputHost, streamOutputTopic, clientPublisher, clientConsumer
# clientConsumerName = "Event Miner (Subscriber 1)"
# clientPublisherName = "Event Publisher (Filter)"
alphabetList = []

firstPrint = True


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def printOutput():
    global firstPrint
    if(firstPrint): # We only print once for the filter, since we just need to send to Repository once.
        print("STREAM")
        firstPrint = False
        sys.stdout.flush()

    # print("STREAM OUTPUT HERE!")

def on_message(client, userdata, message): # Maybe this always needs (client, userdata, message)
    # global clientPublisher, streamOutputTopic
    received = str(message.payload.decode("utf-8"))
    if(received.isupper()):
        # eprint("Publishing: ", received)
        clientPublisher.publish(streamOutputTopic, received)
    
    printOutput()
    

global boolRun
boolRun = True

def subscribeAndRun(streamTopic):
    clientConsumer.loop_start()
    clientConsumer.subscribe(streamTopic)
    clientConsumer.on_message = on_message
    eprint("boolRun: " , boolRun)
    while boolRun: 
        time.sleep(0.5)
    clientConsumer.loop_stop()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)

        resultFileId = body["ResultFileId"]
        input = body["Input"]
        streamMetadata = input["Resources"]["InputStream"]
        streamInfo = streamMetadata["ResourceInfo"]
        streamInputHost = streamInfo["Host"]
        eprint("streamInputHost: ", streamInputHost)
        streamTopic = streamInfo["StreamTopic"]
        output = body["Output"]
        streamOutputHost = output["Host"]
        eprint("streamOutputHost: ", streamOutputHost)
        streamOutputTopic = output["StreamTopic"]

        clientConsumerName = resultFileId + "input"
        clientConsumer = mqtt.Client(clientConsumerName)
        clientConsumer.connect(streamInputHost)


        clientPublisherName = resultFileId + "output"
        clientPublisher = mqtt.Client(clientPublisherName)
        clientPublisher.connect(streamOutputHost)
        

        subscribeAndRun(streamTopic)
