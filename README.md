## Docker
This project supports docker runtime environment.

To build the docker image run, download docker from https://www.docker.com/products/docker-desktop/. 
Run the following commands from the project root to build an image and run it. 

For this project, be aware that express listens on a specfic port (can be found in /API/Endpoints), which must be the same port that is used in the docker file. 

```
docker build -t dockerminer .
docker run -d -p 5000:5000 --name Miner dockerminer:latest
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

## Working around the Wrapper.
### Required Endpoints

### Required Requests
