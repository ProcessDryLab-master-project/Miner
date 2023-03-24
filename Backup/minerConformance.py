import os
import sys
import pm4py
import json
from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.algo.conformance.alignments.petri_net import algorithm as alignments
from pm4py.algo.conformance.tokenreplay import algorithm as token_replay

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



        print("Executing conformance checking")
        modelExists, model_name = API_Func.uploadFile(ref_model_path, referenceFile, '.pnml')
        path_to_model = ref_model_path + model_name
        refModel, initialMarking, finalMarking = pnml_importer.apply(path_to_model)
        img_name = model_name.split('.')[0] + '-ref-model.jpg'
        imgPathLink = self.saveImage(refModel, initialMarking, finalMarking, img_name)
        
        conformanceOutput = dict()
        conformanceOutputList = list()
        nonConformanceTraces = list()
        if(conformanceMethod == "TBR"):
            tbrConformance = token_replay.apply(log, refModel, initial_marking=initialMarking, final_marking=finalMarking)
            
            # print(tbrConformance)
            for jsonObject in tbrConformance:
                if (not jsonObject['trace_is_fit']):
                    cleanTraceOutput = dict()
                    cleanTraceOutput['trace_fitness'] = jsonObject['trace_fitness']
                    # Convert list of Transitions to list of String so that it is JSON serializable
                    cleanTraceOutput['activated_transitions'] = [str(v) for v in jsonObject['activated_transitions']]
                    cleanTraceOutput['transitions_with_problems'] = [str(v) for v in jsonObject['transitions_with_problems']]
                    cleanTraceOutput['transitions_remaining_enabled'] = [str(v) for v in jsonObject['enabled_transitions_in_marking']]
                    nonConformanceTraces.append(cleanTraceOutput)
                    conformanceOutputList.append(cleanTraceOutput)
                    # If the list has more than 5 elements, remove the one with highest trace_fitness so that we only send the worst 5.
                    if(len(conformanceOutputList) > 5):
                        maxVal = max(conformanceOutputList, key=lambda x:x['trace_fitness'])
                        conformanceOutputList.remove(maxVal)
            
            conformanceOutput['num_of_non_conformance'] = len(nonConformanceTraces)
            conformanceOutput['non_conformance_list'] = conformanceOutputList

        if(conformanceMethod == "Alignment"):
            aligned_traces = alignments.apply(log, refModel, initial_marking=initialMarking, final_marking=finalMarking)
        
        
        
        
        
        print(bpmnPath)