import os
import sys
import pm4py
import json
from pm4py.objects.log.importer.xes import importer as xes_importer
# pygraphviz is a bit special. See https://pygraphviz.github.io/documentation/stable/install.html. Install like this:
# python -m pip install --global-option=build_ext `
#               --global-option="-IC:\Program Files\Graphviz\include" `
#               --global-option="-LC:\Program Files\Graphviz\lib" `
#               pygraphviz
result_folder = './Tmp'
if __name__ == "__main__":
    if len(sys.argv) > 1:
        wrapperArgsString = sys.argv[1]
        wrapperArgsDict = json.loads(wrapperArgsString)
        fileSavePath = wrapperArgsDict["LogToRun"] # Location of incoming xes file that wrapper saved on the key from config file
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