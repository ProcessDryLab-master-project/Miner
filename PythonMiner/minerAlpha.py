# from ProcessMiningTool import ProcessMiningTool
import os
import sys
import pm4py
import json
from pm4py.algo.discovery.alpha import algorithm as alphaMiner
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.objects.petri_net.importer import importer as pnml_importer
# from pm4py.visualization.common.save import save as saver
import graphviz  # https://pypi.org/project/graphviz/


# Run this script with this command:
# python ./PythonMiner/main.py ./PythonMiner/test.png ./PythonMiner/test.pnml ./PythonMiner/example-log.xes
dir_path = os.path.dirname(os.path.realpath(__file__))
result_folder = os.path.join(dir_path, 'generated')
if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        wrapperArgsDict = json.loads(wrapperArgsString)
        fileSavePath = wrapperArgsDict["FileSavePath"] # Location of incoming xes file that wrapper saved
        input = wrapperArgsDict["Input"]
        output = wrapperArgsDict["Output"]
        resourceLabel = output["ResourceLabel"]
        fileExtension = output["FileExtension"]

        log = xes_importer.apply(fileSavePath)
        net, initialMarking, finalMarking = alphaMiner.apply(log)

        nameWithExtension = f"{resourceLabel}.{fileExtension}"
        pnmlPath = os.path.join(result_folder, nameWithExtension)
        pm4py.write_pnml(net, initialMarking, finalMarking, pnmlPath)
        print(pnmlPath)

        # imagePath = os.path.join(result_folder, "alpha-" + fileName + ".png")
        # gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
        # pn_visualizer.save(gviz, imagePath)

# Commands:
# Test program locally (without making it an .exe)
# python main.py C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Images\running-example.png C:\Users\sebas\source\repos\PDL\MinerNode\Resources\PNML\running-example.pnml C:\Users\sebas\source\repos\PDL\MinerNode\Resources\Logs\running-example.xes
