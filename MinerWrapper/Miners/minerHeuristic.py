# from ProcessMiningTool import ProcessMiningTool
import os
import sys
import pm4py
import json
from pm4py.algo.discovery.alpha import algorithm as alphaMiner
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.objects.petri_net.importer import importer as pnml_importer
from pm4py.algo.discovery.heuristics import algorithm as hminer

# from pm4py.visualization.common.save import save as saver
import graphviz  # https://pypi.org/project/graphviz/


# Run this script with this command:
# python ./PythonMiner/main.py ./PythonMiner/test.png ./PythonMiner/test.pnml ./PythonMiner/example-log.xes
# dir_path = os.path.dirname(os.path.realpath(__file__))
# result_folder = os.path.join(dir_path, 'generated')
result_folder = './Tmp'
if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        # print("\n\nRunning python script")
        # print(wrapperArgsString)
        # sys.stdout.flush()
        body = json.loads(wrapperArgsString)
        resultFileId = body["ResultFileId"]
        fileSavePath = body["LogToRun"] # Location of incoming xes file that wrapper saved on the key from config file
        input = body["Input"]
        output = body["Output"]
        resourceLabel = output["ResourceLabel"]
        fileExtension = output["FileExtension"]
        minerParameters = input["MinerParameters"]

        # print("fileSavePath: ", fileSavePath)
        # print("resourceLabel: ", resourceLabel)
        # print("minerParameters: ", minerParameters)

        # for key in minerParameters: # print keys
        #     print(key)
        # for key in minerParameters: # print values
        #     print(minerParameters[key])

        log = xes_importer.apply(fileSavePath)
        if minerParameters != None:
            net, initialMarking, finalMarking = hminer.apply(log, minerParameters)
        else:
            net, initialMarking, finalMarking = hminer.apply(log)

        nameWithExtension = f"{resultFileId}.{fileExtension}"
        savePath = os.path.join(result_folder, nameWithExtension)
        if(fileExtension == "pnml"):
            pm4py.write_pnml(net, initialMarking, finalMarking, savePath)
            print(savePath)
        if(fileExtension == "png"):
            gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
            pn_visualizer.save(gviz, savePath)
            print(savePath)


# Commands:
# Test program locally (without making it an .exe)
# python main.py C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Images\running-example.png C:\Users\sebas\source\repos\PDL\MinerNode\Resources\PNML\running-example.pnml C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Logs\running-example.xes
