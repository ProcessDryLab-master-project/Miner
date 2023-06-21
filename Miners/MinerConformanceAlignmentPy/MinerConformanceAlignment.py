import os
import sys
import json
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.algo.conformance.alignments.petri_net import algorithm as alignments
from pm4py.objects.petri_net.importer import importer as pnml_importer

# dir_path = os.path.dirname(os.path.realpath(__file__))
# result_folder = os.path.join(dir_path, 'generated')

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
result_folder = './Tmp'
if __name__ == "__main__":
    if len(sys.argv) > 1:
        eprint("Started Alignment Cornformance Check")
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)
        # eprint("Body: \n", body)
        resultFileId = body["ResultFileId"] # Name of temporary result file, to ensure that it's unique.
        inputLog = body["LogToCheck"] # Location of incoming xes file that wrapper saved on the key from config file
        inputModel = body["ReferenceModel"] # Location of incoming pnml file that wrapper saved on the key from config file
        output = body["Output"]
        resourceLabel = output["ResourceLabel"]
        fileExtension = output["FileExtension"]

        log = xes_importer.apply(inputLog)
        refModel, initialMarking, finalMarking = pnml_importer.apply(inputModel)

        aligned_traces = alignments.apply(log, refModel, initial_marking=initialMarking, final_marking=finalMarking)
        
        # eprint(aligned_traces)
        jsonOutput = json.dumps(aligned_traces, indent=4)

        nameWithExtension = f"{resultFileId}.{fileExtension}"
        savePath = os.path.join(result_folder, nameWithExtension)
        with open(savePath, "w") as outfile:
            outfile.write(jsonOutput)
        print(savePath)