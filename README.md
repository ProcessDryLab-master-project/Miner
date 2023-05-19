# Run
## Docker
This project supports docker runtime environment, for which you will need to download docker from here: https://www.docker.com/products/docker-desktop/.

For this project, be aware that express listens on a specfic port (can be found in /API/Endpoints), which must be the same port that is used in the docker file. 

Open a terminal and navigate to the root of the project.

### Docker network

If you run other services like a repository or service registry through docker locally, you will also need to setup a network. This creates a connection between local docker containers which is essential for establishing a connection.

If you want to run the project(s) with docker compose, the network needs to be created before running the compose file.

To create a docker network run below the commands below in a terminal:

```
docker network create -d bridge data
```
### Docker Compose
It is recommended to use this approach to run the application. To run this project using docker-compose you need to follow the steps below:

Build the docker image:
```
docker-compose build
```
Run the docker image:
```
docker-compose up
```
Stop the docker image:
```
docker-compose down
```

### Dockerfile
Alternatively you can build the image directly from the Dockerfile by running the following commands from the root of the project:

```
docker build -t dockerminer .
docker run -d -p 5000:5000 --name Miner dockerminer:latest
```

When running in docker, localhost and 127.0.0.1 will resolve to the container. If you want to access the outside host (e.g. your machine), you can add an entry to the container's /etc/hosts file. You can read more details on this here: https://www.howtogeek.com/devops/how-to-connect-to-localhost-within-a-docker-container/
This will make localhost available as your destination when requesting from your host-unit e.g. from postman or the browser, not between containers.

To access the outside host, write the following docker run command instead of the one written above:
```
docker run -d -p 5000:5000 --add-host host.docker.internal:host-gateway --name Miner dockerminer:latest
```

Here the value "host.docker.internal" maps to the container's host gateway, which matches the real localhost value. This name can be replaced with your own string.

To establish connections between containers, add a reference to the network by adding the below to your docker run:

```
--network=data
```

The full run command we recommend for local development:

```
docker run -d -p 5000:5000 --add-host localhost:host-gateway --network=data --name Miner dockerminer:latest 
```
## Standard
If you wish to use the Miner Wrapper directly on your machine (without Docker), you must at least install 
- Node 16 or newer: https://nodejs.org/en/download

Additionally, if you wish to use the prebuilt miners, you will need:
- Python: https://www.python.org/downloads/
  - Pip
  - Venv
- Graphviz: https://graphviz.org/download/

When starting the Miner Wrapper the first time, you will need to download the necessary node dependencies. Open a terminal and navigate to the root of the Miner Wrapper and run the following command:
```
npm install
```
When the dependencies have been downloaded, start the project with the command:
```
node .\Index.js
```
If you're running the Miner Wrapper with all the prebuilt python miners, the Miner Wrapper will create virtual environments for each python miner and install their dependencies from the provided requirements.txt files, which may take some time. Any Miner that is ready to use, can be called while the virtual environments are intiialized for the other Miners.
# Adding Miners
Miner nodes in PDL are not restricted to python, and it can be any language as long as the communication described in the Swagger.yaml file is supported, as well as the config.json remains the same. However, the Miner Wrapper currently only support .py, .exe and .jar files, and can be extended to support any algorithm that can be run through a terminal. The Miner Wrapper only has .py and .exe examples.
## Location
When creating or adding new algorithms to the Miner Wrapper, a new sub-folder should be created in 
```
Miner/Miners/<NewMiner>
```
The algorithm should be located in this sub-folder. If it's a python algorithm, the virtual environment and requirements.txt file should also be located on the same level in this sub-folder, e.g.
```
Miner/Miners/<NewMiner>/env
Miner/Miners/<NewMiner>/requirements.txt
Miner/Miners/<NewMiner>/<NewMiner>.py
```
## Configuration
Adding new miners, require that a corresponding item is added to the config.json file, which must follow the same structure as the example miners:
- MinerId: string, must be unique.
- MinerLabel: string, the name that can be seen on the frontend, also a good idea to keep unique.
- Type: string, should always be "Miner". Used to differentiate Miner nodes from Repository nodes.
- MinerPath: string, the path to the folder that was created - e.g. Miners/\<NewMiner\>
- MinerFile: string, the name of the file, with file extension such as .py or .exe.
- Access: string, unused key, however, intended use is to add additional security to each algorithm.
- Shadow: bool, true means the algorithm can be downloaded and used by external miner nodes.
- ResourceInput: list of objects that specify what input resources the algorithm can handle and how it should be used. Each object in the list has the following format:
  - Name: string, used as a key to identify how the input resource should be used by the algorithm
  - FileExtension: string, specifies the file type the algorithm can handle, e.g. "xes", "json", "pnml" etc. This is optional, since input streams for streaming algorithms don't have a file extension.
  - ResourceType: string, specifies the resource type the algorithm can handle, e.g. "EventLog", "Histogram", "ProcessModel" etc.
- ResourceOutput: object that specify the result/output of an algorithm. It has the following keys:
  - FileExtension: string, specifies the file extension of the algorithm output. This is optional, as some algorithms don't output a file (e.g. streams).
  - ResourceType: string, specifies the type output resource type, e.g. "Histogram", "EventStream", "PetriNet" etc.
- MinerParameters: list of objects that specify which parameters an algorithm takes, if any. Each object in the list has the following format:
  - Name: string, 
  - Type: string, e.g. "int", "double", "string" 
  - Min: \<Type\>, the minimum value allowed, e.g. 0
  - Max: \<Type\>, the maximum value allowed, e.g. 10
  - Default: \<Type\>, a default value to help use the algorithm, e.g. 5
  - Description: string, can be used to describe how the parameter should be used

## Writing the algorithm
The Miner Wrapper will take care of all the necessary communication, error handling and config validation, regardless of what type of algorithm it should call, as long as it's supported by the input and output defined by the config. It also takes care of sending and receiving algorithms for shadowing, as well as sending their configurations or adding external algorithm configurations to your config.json.

The request body used when starting a mining algorithm is reused and passed as args to the algorithms main method. If the algorithm need any files as resource input, the Wrapper will retrieve these from a repository and save them in the Tmp folder. The path to these files are added to the body (the input args that the algorithm receives) under the key(s) defined in the ResourceInput list from the configuration object. Any additional inputs, such as streams or algorithm parameters are already defined by the request body and can be extracted as well.

When writing a new algorithm you simply have to read the input args in main and unpack it to a json object.

Algorithms should always save its result in a file in the "./Tmp" folder and print the path to this file. The Wrapper will read "stdout" of any process/algorithm that is being executed, which should always be the path to the file containing the result. If any additional prints/logs are needed, these should be printed as "stderr", so the Wrapper can differentiate between the output path and logging. 

Once an output path has been printed, the Wrapper will send the file to the location defined by the incoming request.
### Examples
- View MinerInductivePy for a python example that takes 1 XES EventLog and no parameters
- View MinerHueristicPy for a python example that takes 1 XES EventLog and multiple parameters
- View MinerConformanceTBRPy for a python example that takes 2 input resources: 1 XES EventLog and 1 PNML PetriNet
- View MqttMinerHistogramPy for a python example that takes an EventStream as input and outputs a Histogram
- View MqttFilterPy for a python example that takes an EventStream as input and outputs a filtered EventStream

## Stream Miners
Streaming algorithms can be implemented largely the same as regular miners, except they will need to connect to the stream themselves. The Stream Broker, that the miner should connect to, and the Stream Topic it should subscribe to, are provided in the request body.
Streaming miners should print the output file path, every time an update has happened to the result, to avoid redundant requests. The Wrapper will ensure that each time the algorithm prints a new path, the new result is being sent to the Repository.

Note: Both consumers and publishers must have a client name when connecting to a Stream Broker. Having 2 clients connected to the same network with the same name will cause errors. This applies to both consumers and publishers of the stream. The example streaming algorithms use a UUID as their client name to avoid issues when starting multiple instances of the same miner.

### Streaming publishers
Since streaming algorithms don't take resources from a Repository, it is up to the developer to ensure that the input stream that is being used, receives data on that Topic. The streaming algorithms used in this project, all consume data from a publically available Stream Broker, called "mqtt.eclipseprojects.io". The Stream Topic receives data from another python script, either "MqttPublisher1.py" or "MqttPublisher2.py". Running any of the example streaming miners without anything publishing to the Topic will do nothing. To run these publishers, you can run the command:
```
py .\Miners\MqttPublisher1.py
# or
py .\Miners\MqttPublisher2.py
```
Both of these publishers do the same, except they are created using different client names to avoid errors. You can either use these publishers directly or change the type of output to suit the needs of your streaming algorithm. Note that neither of these publishers actually publish events, but simply random letters of the alphabet to display a simple example.
### Output streams
If the streaming algorithm outputs a new stream, instead of a result file, the stdout print should be "STREAM" to let the Wrapper know that it shouldn't send a result file from the Tmp folder. The input args that each algorithm receives will contain an output Stream Broker and output Stream Topic, which the algorithm should publish its data to. The Wrapper will still send a metadata object to the Repository, containing information on the location and the type of data, which other streaming miners can consume from.
## Python Virtual Environments
If you're writing your algorithm in python, you will need to create a python virtual environment for each miner. Each virtual environment, called "env", should be located in the folder you created for your algorithm, along with the .py file and the requirements.txt, like this:
```
Miner/Miners/<NewMiner>/env
Miner/Miners/<NewMiner>/requirements.txt
Miner/Miners/<NewMiner>/<NewMiner>.py
```
### Creating a python virtual environment
To create a python virtual environment, consider reading the following: https://python.land/virtual-environments/virtualenv.
Create and/or navigate to the folder where you python miner is/should be located. If we use MinerAlpha.py as an example, navigate to
```
cd ./MinerWrapper/Miners/MinerAlphaPy
```
Create the virtual environment with the following command. Note that "env" is the name of the virtual environment and will create a folder called "env"
```
python -m venv env
```
### Activate the virtual environment.
On Windows with cmd.exe, the command is:
```
env\Scripts\activate.bat
```
On Windows with PowerShell (usually default in vscode terminal), the command is:
```
env\Scripts\Activate.ps1
```
On Linux/Mac the command is:
```
source myvenv/bin/activate
```
### Dependencies in requirements.txt
Make sure you have activated the virtual environment you wish to export/import from/to before executing these steps. To export a list of all the dependencies in a virtual environment, run the following command:

On Windows:
```
pip freeze > requirements.txt
```
On Linux
```
pip3 freeze > requirements.txt
```
To install the dependencies from a requirements.txt file, run the following command:

On Windows:
```
pip install -r requirements.txt
```
On Linux:
```
pip3 install -r requirements.txt
```
## Converting a python script to an executable
The tool currently only support .py, .exe and .jar, however, any file/algorithm that can be run from a terminal can easily be added to the Wrapper.js. If you wish to convert a python script into an executable for any reason, such as to protect the source code, follow these steps:

First you need to install PyInstaller from PyPi. Open a terminal and run:

```
pip install pyinstaller
```
Navigate to the location of the algorithm you wish to turn into an executable, e.g. 
```
Miner/Miners/yourAlgorithmFolder
```
To pack everything into one .exe file, run the following:
```
pyinstaller -F yourPythonScript.py
```

Here you would need to replace "yourAlgorithmFolder" with the name of your folder and "yourPythonScript" with the name of your script.
If you script is called "minerInductiveBpmn.py" the command would be:
```
pyinstaller -F minerInductiveBpmn.py
```

This will create a "build" and "dist" folder, as well as a new ".spec" file.
Move the newly created .exe file from "dist" to a new folder inside "Miners", e.g:
```
Miner/Miners/yourAlgorithmExeFolder
```
Delete the "build" and "dist" folders, and delete the ".spec" file that were created in the folder for your python algorithm, so the only new file is the new .exe file that you moved out.

Add a reference to this new .exe in "config.json" along with your other miners. The config object should largely be able to be copied from the original, however, it should have a new ID and the "MinerPath" and "MinerFile" keys should reference the new folder and .exe file name.