# pip install requests
# pip install paho-mqtt
import paho.mqtt.client as mqtt
import time
import requests
import os
import json


# Variables that we could get from elsewhere
topic = "EventStream"
clientName = "Event Miner (Subscriber 2)"
timeToRun = 60

url = "https://localhost:4000/resources/"
resourceLabel = "miner-2-json"
fileExtension = "json"
fileName = f"{resourceLabel}.{fileExtension}"
resourceType = "Visualization"

# publicly available broker. We need our own
mqttBroker = "mqtt.eclipseprojects.io"  # Don't specify "https://"

client = mqtt.Client(clientName)
client.connect(mqttBroker)

dir_path = os.path.dirname(os.path.realpath(__file__))
result_folder = os.path.join(dir_path, 'generated')
filePath = os.path.join(result_folder, fileName)
print(f'file path for client {clientName}: {filePath}')


# Global variables that probably shouldn't be!
responseId = None
alphabetList = []


def saveToFile(filePath):
    global alphabetList
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(alphabetList, f, ensure_ascii=False, indent=4)


def sendFile(filePath, responseId):
    print("ResponseId: ", responseId)

    payload = {
        'resourceLabel': resourceLabel,
        'fileExtension': fileExtension,
        'resourceType': resourceType
    }
    if (responseId != None):
        payload['overwriteId'] = responseId
    files = [
        ('file', (fileName, open(filePath, 'rb'), 'application/octet-stream'))
    ]

    # TODO: verify=False is to get around SSL verification error. We should fix this at some point
    response = requests.request(
        "POST", url, data=payload, files=files, verify=False)

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


def subscribeAndRun():
    # Run loop for timeToRun seconds. In the loop, subscribe to "TEMPERATURE". When we receive a message, we execute on_message function
    client.loop_start()
    client.subscribe(topic)
    client.on_message = on_message
    time.sleep(timeToRun)
    client.loop_stop()


subscribeAndRun()
