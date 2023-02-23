# from ProcessMiningTool import ProcessMiningTool
import os
import sys
import pm4py
from pm4py.algo.discovery.alpha import algorithm as alphaMiner
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.objects.petri_net.importer import importer as pnml_importer
# from pm4py.visualization.common.save import save as saver
import graphviz # https://pypi.org/project/graphviz/

# From here: https://stackoverflow.com/questions/10047110/is-it-possible-to-pass-arguments-to-a-python-made-exe-at-runtime
if __name__ == "__main__":
    if len(sys.argv)>1:
        imagePath = sys.argv[1]
        print("imagePath from C#: ", imagePath)
        pnmlPath = sys.argv[2]
        print("pnmlPath from C#: ", pnmlPath)
        logPath = sys.argv[3]
        print("logPath from C#: ", logPath)
        
        log = xes_importer.apply(logPath)
        net, initialMarking, finalMarking = alphaMiner.apply(log)
        output = pm4py.write_pnml(net, initialMarking, finalMarking, pnmlPath)
        # output = pm4py.write.write_pnml(net, initialMarking, finalMarking, pnmlPath)
        print("pnml output:\n", output)

        gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
        pn_visualizer.save(gviz, imagePath)
        
        # sys.stdout.flush()

    # def saveImage(petriNet, initialMarking, finalMarking, imgName):
    #         gviz = pn_visualizer.apply(petriNet, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
    #         pn_visualizer.save(gviz, imgName)

    # def get_log(self, logName):
    #         pathToLog = log_path + logName
    #         if(os.path.exists(pathToLog) and logName != ''):
    #             print("Path to log: " + pathToLog)
    #             return True, logName, xes_importer.apply(pathToLog)
    #         else:
    #             defaultLogPath = log_path + default_log_name
    #             print('File name ' + logName + " does not exist. Using default file: " + default_log_name)
    #             return False, default_log_name, xes_importer.apply(defaultLogPath)

    # def readFile():
    #     with open(logPath) as file:
    #         data = file.read()    
    #     print("file contents:\n", data)

# Commands:
# Test program locally (without making it an .exe)
# python main.py C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Images\running-example.png C:\Users\sebas\source\repos\PDL\MinerNode\Resources\PNML\running-example.pnml C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Logs\running-example.xes



# pipinstaller: https://stackoverflow.com/questions/5458048/how-can-i-make-a-python-script-standalone-executable-to-run-without-any-dependen
# Install PyInstaller from PyPI:
# pip install pyinstaller

# Go to your program’s directory and run:
# pyinstaller yourprogram.py

# This will generate the bundle in a subdirectory called dist.
# pyinstaller -F yourprogram.py

# Adding -F (or --onefile) parameter will pack everything into single "exe".
# pyinstaller -F --paths=<your_path>\Lib\site-packages  yourprogram.py

# running into "ImportError" you might consider side-packages.
#  pip install pynput==1.6.8



# cx_freeze: https://www.geeksforgeeks.org/using-cx_freeze-python/
# This requires 2 files; a setup.py and the main.py you want to make into an executable
# pip install cs_Freeze 
# python setup.py build 