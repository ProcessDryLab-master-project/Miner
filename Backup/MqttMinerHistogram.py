# pip install requests
# pip install paho-mqtt
import paho.mqtt.client as mqtt
import time
import requests
import os
import json
import sys

clientName = "Event Miner (Subscriber 2)"

dir_path = os.path.dirname(os.path.realpath(__file__))
result_folder = os.path.join(dir_path, 'generated')
# Global variables that probably shouldn't be!

global alphabetList, resourceTypeOutput, repositoryOutputPath, streamBroker, client, timeToRun, overwriteId, fileExtension
overwriteId = None
alphabetList = []
# Default values.
fileExtension = "json"
resourceTypeOutput = "Visualization" # TODO: Only used when sending, which will likely be moved out to wrapper
repositoryOutputPath = "https://localhost:4000/resources/"
streamBroker = "mqtt.eclipseprojects.io"
timeToRun = 60
client = mqtt.Client(clientName)

def saveToFile(filePath):
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(alphabetList, f, ensure_ascii=False, indent=4)

# TODO: Eventually we want this to be done by the wrapper.
def sendFile(filePath):
    global overwriteId
    print("overwriteId: ", overwriteId)
    payload = {
        'resourceLabel': resourceLabel,
        'fileExtension': fileExtension,
        'resourceType': resourceTypeOutput 
    }
    if (overwriteId != None):
        payload['OverwriteId'] = overwriteId
    files = [
        ('file', (fileName, open(filePath, 'rb'), 'application/octet-stream'))
    ]

    # TODO: verify=False is to get around SSL verification error. We should fix this at some point
    response = requests.request("POST", repositoryOutputPath, data=payload, files=files, verify=False)

    overwriteId = response.text.replace('"', '')

def on_message(client, userdata, message):
    received = str(message.payload.decode("utf-8")).capitalize()
    print("received message: ", received)

    if (any(received in d for d in alphabetList)):  # if list
        index = next(i for i, aDict in enumerate(
            alphabetList) if received in aDict)
    # if (index != None):
        tmpValue = alphabetList[index][received]
        tmpValue = tmpValue + 1
        alphabetList[index] = {received: tmpValue}
    else:
        alphabetList.append({received: 1})
    saveToFile(filePath)
    sendFile(filePath)


def subscribeAndRun(client, streamTopic):
    # Run loop for timeToRun seconds. In the loop, subscribe to "TEMPERATURE". When we receive a message, we execute on_message function
    client.loop_start()
    # client.loop_forever()
    client.subscribe(streamTopic)
    client.on_message = on_message
    time.sleep(timeToRun)
    client.loop_stop()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        wrapperArgsDict = json.loads(wrapperArgsString)

        overwriteId = wrapperArgsDict["OverwriteId"]
        input = wrapperArgsDict["Input"]
        metadataObject = input["MetadataObject"]
        output = wrapperArgsDict["Output"]
        resourceLabel = output["ResourceLabel"]
        fileExtension = output["FileExtension"]
        minerParameters = input.get("MinerParameters")
        streamBroker = metadataObject["Host"]
        streamTopic = metadataObject["StreamInfo"]["StreamTopic"]
        repositoryOutputPath = output["Host"]

        # print(wrapperArgsString)
        # print("input: ", input)
        # print("metadataObject: ", metadataObject)
        # print("output: ", output)
        # print("resourceLabel: ", resourceLabel)
        # print("fileExtension: ", fileExtension)
        # print("minerParameters: ", minerParameters)
        # print("streamBroker: ", streamBroker)
        # print("streamTopic: ", streamTopic)
        # print("repositoryOutputPath: ", repositoryOutputPath)

        fileName = f"{resourceLabel}.{fileExtension}"
        filePath = os.path.join(result_folder, fileName)
        client.connect(streamBroker)

        subscribeAndRun(client, streamTopic)
