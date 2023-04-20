# Miner
Miner Template in Python and Wrapper in JS

Turning a python script into an executable:
First you need to install PyInstaller from PyPi:
pip install pyinstaller

Navigate to the location of the ProcessDryLab\MinerWrapper\Miners
To pack everything into one .exe file, run the following:
pyinstaller -F yourPythonScript.py

Here you would need to replace "yourPythonScript" with the name of your script.
If you script is called "minerInductiveBpmn.py" the command would be:
pyinstaller -F minerInductiveBpmn.py

This will create a "build" and "dist" folder, as well as a new ".spec" file.
Move the newly created .exe file from "dist" to "Miners".
Delete the "build" and "dist" folders, and delete the ".spec" file, so the only new file is the new .exe file.
Add a reference to this new .exe in "config.json" along with your other miners.
This new reference should have a new ID and the "External" key should reference the new .exe file.
References to .exe files must be done with "\\" instead of "/", e.g.:
"External": ".\\Miners\\MinerInductiveBpmn.exe"

instead of:
 
"External": "./Miners/MinerInductiveBpmn.exe"