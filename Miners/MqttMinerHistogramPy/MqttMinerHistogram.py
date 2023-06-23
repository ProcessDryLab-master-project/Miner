# pip install requests
# pip install paho-mqtt
import paho.mqtt.client as mqtt
import time
import os
import json
import sys
import time
import urllib3
import uuid
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

result_folder = './Tmp'
alphabetList = []
prevFile = ""

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def saveToFile(filePath):
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(alphabetList, f, ensure_ascii=False, indent=4)
    # Every time we save, print the path and flush so the wrapper can send it
    print(filePath)
    sys.stdout.flush()

def on_message(client, userdata, message):
    global prevFile
    # received = str(message.payload.decode("utf-8")).capitalize()
    received = str(message.payload.decode("utf-8"))
    # eprint("Received: ", received)
    if(any(received in sublist for sublist in alphabetList)):
        index = next(i for i, sublist in enumerate(alphabetList) if received in sublist)
        # eprint("Index: ", index)
        innerList = alphabetList[index]
        innerList[1] = innerList[1] + 1
        alphabetList[index] = [received, innerList[1]]
    else:
        alphabetList.append([received, 1])
    
    # if prevFile exist in path, do nothing
    if(not os.path.isfile(prevFile)): # Only make new file, if previous file has been deleted by wrapper, which means it's been sent.
        resultFileId = str(uuid.uuid4())
        fileName = f"{resultFileId}.{fileExtension}"
        filePath = os.path.join(result_folder, fileName)
        prevFile = filePath
        saveToFile(filePath)
global boolRun
boolRun = True

def subscribeAndRun(client, streamTopic):
    # Run loop for timeToRun seconds. In the loop, subscribe to "TEMPERATURE". When we receive a message, we execute on_message function
    client.loop_start()
    # client.loop_forever()
    client.subscribe(streamTopic)
    client.on_message = on_message
    eprint("boolRun: ", boolRun)
    while boolRun: 
        time.sleep(0.1)
    # time.sleep(timeToRun)
    client.loop_stop()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)
        
        # resultFileId = body["ResultFileId"]
        resultFileId = str(uuid.uuid4())
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


        # resultFileId = str(uuid.uuid4())
        # fileName = f"{resultFileId}.{fileExtension}"
        # filePath = os.path.join(result_folder, fileName)

        clientName = resultFileId
        client = mqtt.Client(clientName)
        # client.connect_async(streamBroker)
        client.connect(streamBroker)
        subscribeAndRun(client, streamTopic)
