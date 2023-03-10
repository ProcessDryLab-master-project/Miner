import paho.mqtt.client as mqtt
from random import randrange, uniform
import time

# publicly available broker. We need our own
mqttBroker = "mqtt.eclipseprojects.io"  # Don't specify "https://"

client = mqtt.Client("Temperature_Inside")
client.connect(mqttBroker)

while True:
    randNumber = uniform(20.0, 21.0)
    client.publish("TEMPERATURE", randNumber)
    print("Just published " + str(randNumber) + " to topic TEMPERATURE")
    time.sleep(1)
