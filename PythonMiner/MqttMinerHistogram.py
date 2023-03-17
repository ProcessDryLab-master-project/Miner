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
alphabetList = []

global resourceTypeOutput, repositoryOutputPath, streamBroker, client, timeToRun, overwriteId, fileExtension
overwriteId = None
# Default values.
fileExtension = "json"
resourceTypeOutput = "Visualization" # TODO: Only used when sending, which will likely be moved out to wrapper
repositoryOutputPath = "https://localhost:4000/resources/"
streamBroker = "mqtt.eclipseprojects.io"
timeToRun = 60
client = mqtt.Client(clientName)


def saveToFile(filePath):
    global alphabetList
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(alphabetList, f, ensure_ascii=False, indent=4)


def sendFile(filePath, overwriteId):
    # global resourceTypeOutput, repositoryOutputPath
    # print("overwriteId: ", overwriteId)

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

    responseId = response.text.replace('"', '')
    return responseId


def on_message(client, userdata, message):
    global responseId, alphabetList
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
    responseId = sendFile(filePath, responseId)


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
        print(wrapperArgsString)

        input = wrapperArgsDict["Input"]
        print("input: ", input)
        metadataObject = input["MetadataObject"]
        print("metadataObject: ", metadataObject)
        output = wrapperArgsDict["Output"]
        print("output: ", output)
        resourceLabel = output["ResourceLabel"]
        print("resourceLabel: ", resourceLabel)
        fileExtension = output["FileExtension"]
        print("fileExtension: ", fileExtension)
        minerParameters = input["MinerParameters"]
        print("minerParameters: ", minerParameters)
        streamBroker = metadataObject["Host"]
        print("streamBroker: ", streamBroker)
        streamTopic = metadataObject["StreamInfo"]["StreamTopic"]
        print("streamTopic: ", streamTopic)
        repositoryOutputPath = output["Host"]
        print("repositoryOutputPath: ", repositoryOutputPath)


        overwriteId = wrapperArgsDict["OverwriteId"]

        fileName = f"{resourceLabel}.{fileExtension}"
        filePath = os.path.join(result_folder, fileName)
        # print(f'file path for client {clientName}: {filePath}')
        # client = mqtt.Client(clientName)
        client.connect(streamBroker)

        subscribeAndRun(client, streamTopic)

# # Variables that we could get from elsewhere
# topic = "EventStream"
# timeToRun = 60
# url = "https://localhost:4000/resources/"
# resourceLabel = "miner-2-json"
# fileName = f"{resourceLabel}.{fileExtension}"
# resourceType = "Visualization"

# # publicly available broker. We need our own
# mqttBroker = "mqtt.eclipseprojects.io"  # Don't specify "https://"

# client = mqtt.Client(clientName)
# client.connect(mqttBroker)

# dir_path = os.path.dirname(os.path.realpath(__file__))
# result_folder = os.path.join(dir_path, 'generated')
# filePath = os.path.join(result_folder, fileName)
# print(f'file path for client {clientName}: {filePath}')
