import os
import sys
import pm4py
import json
from pm4py.objects.log.importer.xes import importer as xes_importer

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
        # log = pm4py.read_xes(fileSavePath)
        # log = pm4py.convert_to_event_log(log)
        tree = pm4py.discover_process_tree_inductive(log)

        bpmn_graph = pm4py.convert_to_bpmn(tree)

        nameWithExtension = f"{resourceLabel}.{fileExtension}"
        bpmnPath = os.path.join(result_folder, nameWithExtension)
        pm4py.write_bpmn(bpmn_graph, bpmnPath)
        print(bpmnPath)