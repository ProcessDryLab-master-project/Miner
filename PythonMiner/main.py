# from ProcessMiningTool import ProcessMiningTool
import os
import sys
import pm4py
from pm4py.algo.discovery.alpha import algorithm as alphaMiner
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.objects.petri_net.importer import importer as pnml_importer
# from pm4py.visualization.common.save import save as saver
import graphviz  # https://pypi.org/project/graphviz/


# Run this script with this command:
# python ./PythonMiner/main.py ./PythonMiner/test.png ./PythonMiner/test.pnml ./PythonMiner/example-log.xes
dir_path = os.path.dirname(os.path.realpath(__file__))
# print("\n\nDirectory path from python: " + dir_path)
if __name__ == "__main__":
    if len(sys.argv) > 1:
        fileSavePath = sys.argv[1]
        fileName = sys.argv[2]
        fileType = sys.argv[3]
        # arg1 = sys.argv[1]
        # print("fileSavePath: ", fileSavePath)
        # print("fileName: ", fileName)
        # print("fileType: ", fileType)

        log = xes_importer.apply(fileSavePath)
        net, initialMarking, finalMarking = alphaMiner.apply(log)

        imagePath = os.path.join(dir_path, fileName + ".png")
        pnmlPath = os.path.join(dir_path, fileName + ".pnml")
        output = pm4py.write_pnml(net, initialMarking, finalMarking, pnmlPath)
        # output = pm4py.write.write_pnml(net, initialMarking, finalMarking, pnmlPath)
        print(pnmlPath)
        # print("pnml output:\n", output)

        # gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
        # pn_visualizer.save(gviz, imagePath)


# if __name__ == "__main__":
#     if len(sys.argv)>1:
#         imagePath = os.path.join(dir_path, sys.argv[1])
#         print("imagePath from C#: ", imagePath)
#         pnmlPath = os.path.join(dir_path, sys.argv[2])
#         print("pnmlPath from C#: ", pnmlPath)
#         logPath = os.path.join(dir_path, sys.argv[3])
#         print("logPath from C#: ", logPath)

#         # imagePath = sys.argv[1]
#         # print("imagePath from C#: ", imagePath)
#         # pnmlPath = sys.argv[2]
#         # print("pnmlPath from C#: ", pnmlPath)
#         # logPath = sys.argv[3]
#         # print("logPath from C#: ", logPath)

#         log = xes_importer.apply(logPath)
#         net, initialMarking, finalMarking = alphaMiner.apply(log)
#         output = pm4py.write_pnml(net, initialMarking, finalMarking, pnmlPath)
#         # output = pm4py.write.write_pnml(net, initialMarking, finalMarking, pnmlPath)
#         print("pnml output:\n", output)

#         gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
#         pn_visualizer.save(gviz, imagePath)

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
