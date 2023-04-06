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

clientName = "Event Miner (Subscriber 2)"
result_folder = './Tmp'
# Global variables that probably shouldn't be!

global alphabetList, resourceTypeOutput, repositoryOutputPath, streamBroker, client, timeToRun, overwriteId, fileExtension
alphabetList = []
# Default values.
fileExtension = "json"
resourceTypeOutput = "Visualization" # TODO: Only used when sending, which will likely be moved out to wrapper
repositoryOutputPath = "https://localhost:4000/resources/"
streamBroker = "mqtt.eclipseprojects.io"
timeToRun = 30
client = mqtt.Client(clientName)

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def saveToFile(filePath):
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(alphabetList, f, ensure_ascii=False, indent=4)
    # Every time we save, print the path and flush so the wrapper can send it
    print(filePath)
    sys.stdout.flush()

def on_message(client, userdata, message):
    received = str(message.payload.decode("utf-8")).capitalize()
    # eprint("Received: ", received)
    if(any(received in sublist for sublist in alphabetList)):
        index = next(i for i, sublist in enumerate(alphabetList) if received in sublist)
        # eprint("Index: ", index)
        innerList = alphabetList[index]
        innerList[1] = innerList[1] + 1
        alphabetList[index] = [received, innerList[1]]
    else:
        alphabetList.append([received, 1])
    saveToFile(filePath)
global boolRun
def on_disconnect(client, userdata,rc=0):
    # logging.debug("DisConnected result code "+str(rc))
    eprint("Disconnected")
    stopRun = True
    client.loop_stop()

def subscribeAndRun(client, streamTopic):
    # Run loop for timeToRun seconds. In the loop, subscribe to "TEMPERATURE". When we receive a message, we execute on_message function
    client.loop_start()
    # client.loop_forever()
    client.subscribe(streamTopic)
    client.on_message = on_message
    while not boolRun: time.sleep(0.1)
    # time.sleep(timeToRun)
    client.loop_stop()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)
        
        resultFileId = body["ResultFileId"]
        input = body["Input"]
        # minerParameters = input.get("MinerParameters")
        # print("minerParameters: ", minerParameters)
        streamMetadata = input["Resources"]["InputStream"]
        streamInfo = streamMetadata["ResourceInfo"]
        streamBroker = streamInfo["Host"]
        streamTopic = streamInfo["StreamTopic"]
        output = body["Output"]
        resourceLabel = output["ResourceLabel"]
        fileExtension = output["FileExtension"]
        repositoryOutputPath = output["Host"]

        # print(wrapperArgsString)
        # print("input: ", input)
        # print("metadataObject: ", streamMetadata)
        # print("output: ", output)
        # print("resourceLabel: ", resourceLabel)
        # print("fileExtension: ", fileExtension)
        # print("streamBroker: ", streamBroker)
        # print("streamTopic: ", streamTopic)
        # print("repositoryOutputPath: ", repositoryOutputPath)

        boolRun = False
        fileName = f"{resultFileId}.{fileExtension}"
        filePath = os.path.join(result_folder, fileName)
        # client.connect_async(streamBroker)
        client.connect(streamBroker)
        subscribeAndRun(client, streamTopic)
