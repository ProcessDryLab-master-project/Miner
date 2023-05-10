# Docker
This project supports docker runtime environment, for which you will need to download docker from here: https://www.docker.com/products/docker-desktop/.

For this project, be aware that express listens on a specfic port (can be found in /API/Endpoints), which must be the same port that is used in the docker file. 

Open a terminal and navigate to the root of the project.

## Docker network

If you run other services like a repository or service registry through docker locally, you will also need to setup a network. This creates a connection between local docker containers which is essential for establishing a connection.

If you want to run the project(s) with docker compose, the network needs to be created before running the compose file.

To create a docker network run below the commands below in a terminal:

```
docker network create -d bridge data
```

## Docker Compose
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

## Dockerfile
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

## Adding a new Miner action
Write the algorithm.
If it's a script, it can be added directly to the ./MinerWrapper/Miners folder.
If the miner should be cloneable, it must be turned into an executable first.
If it's anything other than a script it must also be turned into an exectuable to work with the wrapper.

## Converting a python script to an executable
First you need to install PyInstaller from PyPi:
### `pip install pyinstaller`

Navigate to the location of the ProcessDryLab\MinerWrapper\Miners
To pack everything into one .exe file, run the following:
### `pyinstaller -F yourPythonScript.py`

Here you would need to replace "yourPythonScript" with the name of your script.
If you script is called "minerInductiveBpmn.py" the command would be:
### `pyinstaller -F minerInductiveBpmn.py`

This will create a "build" and "dist" folder, as well as a new ".spec" file.
Move the newly created .exe file from "dist" to "Miners".
Delete the "build" and "dist" folders, and delete the ".spec" file, so the only new file is the new .exe file.

Add a reference to this new .exe in "config.json" along with your other miners.
This new reference should have a new ID and the "External" key should reference the new .exe file.
References to .exe files must be done with "\\" instead of "/", e.g.:
### `"External": ".\\Miners\\MinerInductiveBpmn.exe"`

Instead of:
 
### `"External": "./Miners/MinerInductiveBpmn.exe"`


## Creating a python virtual environment
Consider reading the following: https://python.land/virtual-environments/virtualenv
Create and/or navigate to the folder where you python miner is/should be located. If we use MinerAlpha.py as an example, navigate to
### `cd ./MinerWrapper/Miners/MinerAlphaPy`

Create the virtual environment with the following command. Note that "env" is the name of the virtual environment and will create a folder called "env"
### `python -m venv env`
#### Activate the virtual environment.
On Windows with cmd.exe, the command is:
### `env\Scripts\activate.bat`

On Windows with PowerShell (usually default in vscode terminal), the command is:
### `env\Scripts\Activate.ps1`

On Linux/Mac the command is:
### `source myvenv/bin/activate`


## Working around the Wrapper.
### Required Endpoints

### Required Requests
