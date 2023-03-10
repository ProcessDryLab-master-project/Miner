import paho.mqtt.client as mqtt
import time
import pygraphviz as pgv
import requests
import os

# Variables that we could get from elsewhere
topic = "EventStream"
clientName = "Event Miner (Subscriber 1)"
timeToRun = 60

url = "https://localhost:4000/resources/"
fileLabel = "miner-1-dot"
fileExtension = "dot"
resourceType = "Visualization"

# publicly available broker. We need our own
mqttBroker = "mqtt.eclipseprojects.io"  # Don't specify "https://"

client = mqtt.Client(clientName)
client.connect(mqttBroker)

dir_path = os.path.dirname(os.path.realpath(__file__))
result_folder = os.path.join(dir_path, 'generated')
filePath = os.path.join(result_folder, f"{fileLabel}.{fileExtension}")
print(f'file path for client {clientName}: {filePath}')


# Global variables that probably shouldn't be!
dotGraph = pgv.AGraph(name="StreamGraph", strict=True, directed=True)
dotGraph.add_node('START')
dotGraph.add_node('END')
version = 0
versionCopy = version
responseId = None
gNumUpper = 1
gNumLower = 1
gNumA = 1


def stupidAlgorithm(received, numA, numUpper, numLower):
    name = None
    global version, versionCopy, responseId
    if (received == "A" or received == "a"):
        numA += 1
        name = addNode("A")
    elif (received.isupper()):
        numUpper += 1
        name = addNode("UPPER")
    elif (received.islower()):
        numLower += 1
        name = addNode("LOWER")

    if (numUpper % 5 == 0 or numUpper % 5 == 0 or numUpper % 5 == 0):
        version += 1  # indicate a change
        node = dotGraph.get_node(name)
        node.attr['color'] = 'red'

    if (version != versionCopy):  # if some change was made
        print("Changes were made")
        saveDotGraph(filePath)
        responseId = sendDotGraph(filePath, responseId)

    versionCopy = version
    return numA, numUpper, numLower


def sendDotGraph(filePath, responseId):
    print("ResponseId: ", responseId)
    # url = "https://localhost:4000/resources/"

    payload = {
        'fileLabel': fileLabel,
        'fileExtension': fileExtension,
        'resourceType': resourceType
    }
    if (responseId != None):
        payload['overwriteId'] = responseId
    files = [
        ('file', ('testDot-1.dot', open(filePath, 'rb'), 'application/octet-stream'))
    ]

    # TODO: verify=False is to get around SSL verification error. We should fix this at some point
    response = requests.request(
        "POST", url, data=payload, files=files, verify=False)

    responseId = response.text.replace('"', '')
    return responseId


def saveDotGraph(path):
    dotGraphString = dotGraph.string()
    # print(dotGraphString)
    dotGraph.write(path)
    return dotGraphString


def drawGraph(path):
    dotGraph.layout()  # default to neato.
    # dotGraph.layout(prog='dot')  # Otherwise use dot:
    dotGraph.draw(path, format=fileExtension)


def addNode(nodeName):
    if (not dotGraph.has_node(nodeName)):
        dotGraph.add_node(nodeName)
        dotGraph.add_edge("START", nodeName)
        dotGraph.add_edge(nodeName, "END")
        global version
        version += 1  # indicate a change
    return nodeName


def on_message(client, userdata, message):
    received = str(message.payload.decode("utf-8"))
    print("received message: ", received)
    global gNumA, gNumUpper, gNumLower
    # numA = gNumA
    # numUpper = gNumUpper
    # numLower = gNumLower
    print(f"numA: {gNumA}, numUpper: {gNumUpper}, numLower: {gNumLower}")
    gNumA, gNumUpper, gNumLower = stupidAlgorithm(
        received, gNumA, gNumUpper, gNumLower)


def subscribeAndRun():
    # Run loop for timeToRun seconds. In the loop, subscribe to "TEMPERATURE". When we receive a message, we execute on_message function
    client.loop_start()
    client.subscribe(topic)
    client.on_message = on_message
    time.sleep(timeToRun)
    client.loop_stop()


subscribeAndRun()
