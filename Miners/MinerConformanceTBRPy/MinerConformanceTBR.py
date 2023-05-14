import os
import sys
import json
import pm4py
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.algo.conformance.tokenreplay import algorithm as token_replay
from pm4py.objects.petri_net.importer import importer as pnml_importer

# dir_path = os.path.dirname(os.path.realpath(__file__))
# result_folder = os.path.join(dir_path, 'generated')

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
result_folder = './Tmp'
if __name__ == "__main__":
    if len(sys.argv) > 1:
        eprint("Started TBR Cornformance Check")
        wrapperArgsString = sys.argv[1]
        body = json.loads(wrapperArgsString)
        # eprint("Body: \n", body)
        resultFileId = body["ResultFileId"] # Name of temporary result file, to ensure that it's unique.
        inputLog = body["LogToCheck"] # Location of incoming xes file that wrapper saved on the key from config file
        eprint("inputLog: ", inputLog)
        inputModel = body["ReferenceModel"] # Location of incoming pnml file that wrapper saved on the key from config file
        eprint("inputModel: ", inputModel)
        output = body["Output"]
        fileExtension = output["FileExtension"]

        log = xes_importer.apply(inputLog)
        refModel, initialMarking, finalMarking = pnml_importer.apply(inputModel)
        
        tbrConformance = token_replay.apply(log, refModel, initial_marking=initialMarking, final_marking=finalMarking)
        # conformanceOutput = dict()
        # conformanceOutputList = list()
        # nonConformanceTraces = list()
        # for jsonObject in tbrConformance:
        #     if (not jsonObject['trace_is_fit']):
        #         cleanTraceOutput = dict()
        #         cleanTraceOutput['trace_fitness'] = jsonObject['trace_fitness']
        #         # Convert list of Transitions to list of String so that it is JSON serializable
        #         cleanTraceOutput['activated_transitions'] = [str(v) for v in jsonObject['activated_transitions']]
        #         cleanTraceOutput['transitions_with_problems'] = [str(v) for v in jsonObject['transitions_with_problems']]
        #         cleanTraceOutput['transitions_remaining_enabled'] = [str(v) for v in jsonObject['enabled_transitions_in_marking']]
        #         nonConformanceTraces.append(cleanTraceOutput)
        #         conformanceOutputList.append(cleanTraceOutput)
        #         # If the list has more than 5 elements, remove the one with highest trace_fitness so that we only send the worst 5.
        #         if(len(conformanceOutputList) > 5):
        #             maxVal = max(conformanceOutputList, key=lambda x:x['trace_fitness'])
        #             conformanceOutputList.remove(maxVal)
        
        # conformanceOutput['num_of_non_conformance'] = len(nonConformanceTraces)
        # conformanceOutput['non_conformance_list'] = conformanceOutputList
        
        jsonString = json.dumps(str(tbrConformance), indent=4)

        nameWithExtension = f"{resultFileId}.{fileExtension}"
        savePath = os.path.join(result_folder, nameWithExtension)
        # eprint("savePath", savePath)
        jsonFile = open(savePath, "w")
        jsonFile.write(jsonString)
        jsonFile.close()

        print(savePath)