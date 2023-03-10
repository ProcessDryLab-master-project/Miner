import collections
from io import StringIO
import sys
from re import T
import types
from numpy.core.fromnumeric import mean
from pm4py.algo.evaluation.replay_fitness import algorithm as eval_replay_fitness
from pm4py.algo.evaluation.precision import algorithm as eval_precision
from pm4py.algo.evaluation.generalization import algorithm as eval_generalization
from pm4py.algo.evaluation.simplicity import algorithm as eval_simplicity
from pm4py.statistics.passed_time.log.variants import post
from pm4py.algo.filtering.log.attributes import attributes_filter
from scipy import stats


from pm4py.objects.log.importer.xes import importer as xes_importer
from pm4py.objects.petri_net.importer import importer as pnml_importer
from pm4py.algo.conformance.alignments.petri_net import algorithm as alignments
from pm4py.algo.conformance.tokenreplay import algorithm as token_replay
from pm4py.algo.discovery.alpha import algorithm as alphaMiner
from pm4py.algo.discovery.heuristics import algorithm as heuristicsMiner
from pm4py.algo.discovery.inductive import algorithm as inductiveMiner
from pm4py.objects.petri_net.obj import PetriNet
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.algo.discovery.dfg import algorithm as dfg_discovery
from pm4py.algo.filtering.log.timestamp import timestamp_filter
from pm4py.algo.filtering.log.variants import variants_filter
from pm4py.algo.filtering.log.attributes import attributes_filter
from pm4py.evaluation.precision import evaluator as precision_evaluator
from pm4py.algo.analysis.woflan import algorithm as woflan

from pm4py.algo.discovery.log_skeleton import algorithm as log_skeleton_discovery
import networkx as nx

from pm4py.algo.conformance.log_skeleton import algorithm as log_skeleton_conformance

import pandas as pd

from copy import deepcopy
     

# from pm4py.objects.petri import performance_map
from pm4py.objects.log.util import interval_lifecycle
import os
import pm4py
from PMutil import PMutil
from flask import jsonify
import numpy as np
import json
import pprint
import itertools
import re

import API_Functions as API_Func

log_path = './logs/'
ref_model_path = './reference_models/'
img_folder_path = './static/images/'

default_log_name = 'running-example.xes'
default_ref_model = 'running-example.pnml'
class ProcessMiningTool():
    def applyAlgorithm(self, miner, logName, log, algorithmParams):
        #FIXME it would be better to have the petrinet as a type of object instead of a picture - so we can analyse it and conformance check it
        #log = self.get_log(logName)
        print("Executing " + miner + " algorithm with params: " + str(algorithmParams))
        # print(algorithmParams)
        if(log is not None):
            if(miner == 'Alpha'):
                net, initialMarking, finalMarking = alphaMiner.apply(log)
            elif(miner == 'Heuristic'):
                net, initialMarking, finalMarking = heuristicsMiner.apply(log, algorithmParams)
            elif(miner == 'Inductive'):
                inductive_params = algorithmParams['INDUCTIVE_PARAMS']
                print("Inductive params: " + str(inductive_params))
                if(algorithmParams['INDUCTIVE_VARIANTS'] == 'VARIANTS_IM'):
                    print("Inductive miner with perfect replay fitness")
                    net, initialMarking, finalMarking = inductiveMiner.apply(log, inductive_params, variant=inductiveMiner.Variants.IM)
                if(algorithmParams['INDUCTIVE_VARIANTS'] == 'VARIANTS_IMf'):
                    print("Inductive miner with more precision but no fitness guarantees.")
                    net, initialMarking, finalMarking = inductiveMiner.apply(log, inductive_params, variant=inductiveMiner.Variants.IMf)
                if(algorithmParams['INDUCTIVE_VARIANTS'] == 'VARIANTS_IMd'):
                    print("Inductive miner with only direct follows. Maximum performance but replay fitness guarantees is lost")
                    net, initialMarking, finalMarking = inductiveMiner.apply(log, inductive_params, variant=inductiveMiner.Variants.IMd)
                else:
                    net, initialMarking, finalMarking = inductiveMiner.apply(log)
            else:
                return {'Arg' : miner, 'Error' : 'Algorithm ' + miner + ' not yet implemented'}

            # Save generated petrinet as img and send link as part of the response
            img_name = logName.split('.')[0] + '-' + miner + '-net.jpg'
            imgPathLink = self.saveImage(net, initialMarking, finalMarking, img_name)

            # Evaluate the processed petrinet with the 4 dimensions, fitness, simplicity, precision, generalisation:
            replay_fitness = eval_replay_fitness.apply(log, net, initialMarking, finalMarking)  # We can select "TOKEN_BASED" instead of "ALIGNMENT_BASED", but alignment seems to be better.
            precision = eval_precision.apply(log, net, initialMarking, finalMarking)
            generalization = eval_generalization.apply(log, net, initialMarking, finalMarking)
            simplicity = eval_simplicity.apply(net)
            
            
            #get_soundness(self,net,initialMarking,finalMarking)
            
            evaluationOutput = dict()
            evaluationOutput['replay_fitness'] = replay_fitness
            evaluationOutput['precision'] = precision
            evaluationOutput['generalization'] = generalization
            evaluationOutput['simplicity'] = simplicity
            # print(evaluationOutput)
            return imgPathLink, evaluationOutput
        else:
            return {'Arg' : "ERROR: File " + logName + " does not exist"}

    def activity_time_variation(self, log):
        print("Executing activity_time_variation")
        df = API_Func.get_dataframe_from_log(log)
        dfReturnList = list()
        dfFullDict = dict()
        dfList = list()
        for index, row in df.iterrows():
            dfFullDict[row['Activity']] = []
            dfDict = dict()
            dfDict['Activity'] = row['Activity']
            dfDict['Trace'] = row['Trace']
            dfDict['UsedTime'] = row['UsedTime']
            dfList.append(dfDict)
        
        for activity in dfList:
            dfFullDict[activity['Activity']].append(activity)

        for keys in dfFullDict.keys():
            minVal = min(dfFullDict[keys], key=lambda x:x['UsedTime'])
            maxVal = max(dfFullDict[keys], key=lambda x:x['UsedTime'])
            meanVal = post.apply(log, keys)['post_avg_perf']
            a = np.zeros([len(dfFullDict[keys])])
            for i in range(len(dfFullDict[keys])):
                a[i] = dfFullDict[keys][i]['UsedTime']
            standardDeviation = np.std(a)
            standardizedDeviation = stats.zscore(a, axis=None)

            minDict = {
                'Trace': minVal['Trace'],
                'TimeSpent': minVal['UsedTime'],
                'MinStd': min(standardizedDeviation)
            }
            maxDict = {
                'Trace': maxVal['Trace'],
                'TimeSpent': maxVal['UsedTime'],
                'MaxStd': max(standardizedDeviation)
            }
            dfOutputDict = {
                'Activity': keys,
                'Mean': post.apply(log, keys)['post_avg_perf'],
                'Coefficient_of_variation': standardDeviation / meanVal * 100,
                'MinTime' : minDict,
                'MaxTime' : maxDict
            }

            if(not np.isnan(dfOutputDict['Coefficient_of_variation'])):
                dfReturnList.append(dfOutputDict)
                if(len(dfReturnList) > 5):
                    maxDeviation = max(dfReturnList, key=lambda x:x['Coefficient_of_variation'])
                    dfReturnList.remove(maxDeviation)
        # sOutput = sorted(dfReturnList, key=lambda x: x['Coefficient_of_variation'], reverse=True)

        return dfReturnList        

    def conformanceCheck(self, log, referenceFile, conformanceMethod):
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
            # print("Aligned traces: " + str(aligned_traces)) 

        # print("\n------------ Printing TBR Conformance (Diagnostics) ------------\n")
        # print(tbrConformance)
        
        # aligned_traces = alignments.apply(log, refModel, initial_marking=initialMarking, final_marking=finalMarking)
        # print("\n------------ Printing Alignment Conformance ------------\n")
        # print(aligned_traces)

        print("Conformance check complete")
        return conformanceOutput

    def saveImage(self, petriNet, initialMarking, finalMarking, name):
        gviz = pn_visualizer.apply(petriNet, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY)
        imgPath = img_folder_path + name
        pn_visualizer.save(gviz, imgPath)
        imgPathLink = 'http://localhost:4000/static/images/' + name
        print("Link to img: " + imgPathLink)
        return imgPathLink

    def generateResponse(self):
        res = dict()
        res["AlgorithmFitness"] = 1
        res["PetriNet"] = "static/images/picture.jpg"
        res['AlgorithmEvaluation'] = {}
        res['LogSkeleton'] = {}
        res['ActivityDeviations'] = []
        res["Bottleneck"] = []
        res["Conformance"] = {}
        res["LongestPath"] = []
        res["LongestDuration"] = []
        return res

    def get_algorithm_fitness(self, log, net, initial_marking, final_marking):
        return  pm4py.algo.evaluation.generalization.algorithm.apply(log, net, initial_marking, final_marking)

    # pm4py.conformance_diagnostics_token_based_replay
    def get_petrinet(self, petrinetName):
        pathToPetri = img_folder_path + petrinetName
        return pathToPetri

    def analyse_log(self, logName, petrinetName):
        log = self.get_log(logName)
        petri = self.get_petrinet(petrinetName)
        if (log is None or petri is None):
            return 0
        logImproved = self.remove_unnecessary_paths(log)
        comparison = self.compare_logs
        #TODO Complete function (use the helper functions to determine improvements to the log)

    def get_log(self, logName):
        pathToLog = log_path + logName
        if(os.path.exists(pathToLog) and logName != ''):
            print("Path to log: " + pathToLog)
            return True, logName, xes_importer.apply(pathToLog)
        else:
            defaultLogPath = log_path + default_log_name
            print('File name ' + logName + " does not exist. Using default file: " + default_log_name)
            return False, default_log_name, xes_importer.apply(defaultLogPath)

    def suggest_best_algorithm(self, logName, log, algorithmParams):
        #TODO CompBestMinerNamelete function (return the most suitable algorithm for analysis of log)
        imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm('Alpha', logName, log, algorithmParams)
        BestMinerFitness = self.get_algorithm_fitness(log, generatedPetriNet, initialMarking, finalMarking)
        BestMinerName = 'Alpha'

        imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm('Heuristic', logName, log, algorithmParams)
        CurrentMinerFitness = self.get_algorithm_fitness(log, generatedPetriNet, initialMarking, finalMarking)

        if CurrentMinerFitness > BestMinerFitness:
            BestMinerFitness = CurrentMinerFitness
            BestMinerName = 'Heuristic'

        #Inductive miner get activities and set threashold + modeltype => check best conformance
        imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm('Inductive', logName, log, algorithmParams)
        CurrentMiner = self.get_algorithm_fitness(log, generatedPetriNet, initialMarking, finalMarking)

        if CurrentMinerFitness > BestMinerFitness:
            BestMinerFitness = CurrentMinerFitness
            BestMinerName = 'Inductive'
        return BestMinerName

    # Give log and acitivity -> Get image with colored lines
    def get_anaylyse_bottle_neck_for_specific_acitivities(log, activities):
        if activities.size() <= 2:  #function requires atleast 2 activities
            pm4py.view_performance_spectrum(log, activities, format="svg")
    
    potentialBottleNecks = 0
    # Returns a json object that fits the API format for sending data to the frontend
    def get_bottlenecks(self, log, acceptanceRatio = 0.7):
        print("Executing get_bottlenecks")
        #@Param(acceptanceRatio, number) is the ratio of acceptance between incomming and outgoing edges
        dfg = dfg_discovery.apply(log)
        activityList = PMutil.get_activities_list(log)
        global potentialBottleNecks
        potentialBottleNecks = list()
    
        acitivityConnectionData = PMutil.init_activity_connection_data(dfg, activityList)
        startActivities = PMutil.get_start_activities(acitivityConnectionData)
        endActivities = PMutil.get_end_activities(acitivityConnectionData)
        for activity in acitivityConnectionData:
            listObject = dict()
            edgeRatio = 0
            if activity in startActivities or activity in endActivities: #If its start activity
                edgeRatio = 1
            else: 
                edgeRatio = acitivityConnectionData[activity][1] / acitivityConnectionData[activity][0]
                
            if edgeRatio < acceptanceRatio:
                listObject["name"] = activity
                listObject["probability"] = edgeRatio
                # listObject[activity] = edgeRatio
                potentialBottleNecks.append(listObject)
                # potentialBottleNecks.append(activity)
        
        print("get_bottlenecks complete")
        return potentialBottleNecks
        # return json.dumps(potentialBottleNecks)        
    
    # Param variant : string-list
    def get_variant_percentage(self, log, variant):
        sortedVariants = pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log))
        parameterVariantOccurances = 0
        totalVariantOccurances = 0
        for variant_and_occ in sortedVariants:
            lastItem = variant_and_occ.pop()
            totalVariantOccurances += lastItem
            if variant == variant_and_occ[0] :
                parameterVariantOccurances = lastItem
        return (parameterVariantOccurances / totalVariantOccurances) * 100

    MeanTimeSortedDict = 0
    slowestVariant = 0
    def get_longest_path_in_log(self, log): #for variant get time and frequency then sort(order)
        variants,a = pm4py.statistics.variants.log.get.get_variants_along_with_case_durations(log)
        global MeanTimeSortedDict, slowestVariant
        MeanTimeSortedDict = a
        for key, value in a.items():
            MeanTimeSortedDict[key] = np.mean(value)
    

        
        MeanTimeSortedDict= dict(sorted(MeanTimeSortedDict.items(), key=lambda item: item[1],reverse=True ))
        slowestVariant = list(MeanTimeSortedDict.keys())[0]
        time = MeanTimeSortedDict[slowestVariant]
        relativeFrequency = self.get_variant_percentage(log,slowestVariant)
        variantNumber = variants[slowestVariant][0]._get_attributes()['concept:name']

        #returns the slowest variant, its time in seconds and its relative frequency to other variants
        return [slowestVariant,time, relativeFrequency,variantNumber]

    def get_shortest_path_in_log(self, log): #for variant get time and frequency then sort(order)
        variants,a = pm4py.statistics.variants.log.get.get_variants_along_with_case_durations(log)
        global MeanTimeSortedDict, FastestVariant
        MeanTimeSortedDict = a
        for key, value in a.items():
            MeanTimeSortedDict[key] = np.mean(value)
    

        
        MeanTimeSortedDict= dict(sorted(MeanTimeSortedDict.items(), key=lambda item: item[1],reverse=False ))
        FastestVariant = list(MeanTimeSortedDict.keys())[0]
        time = MeanTimeSortedDict[FastestVariant]
        relativeFrequency = self.get_variant_percentage(log,FastestVariant)
        variantNumber = variants[FastestVariant][0]._get_attributes()['concept:name']

        #returns the slowest variant, its time in seconds and its relative frequency to other variants
        return [FastestVariant,time, relativeFrequency,variantNumber]

    def get_longest_total_duration(self, log): 
        print("Executing get_longest_total_duration")
        #returns the sum of a variant with the greatest time
        #in this way both frequency and time is taken into account.
        #example 2 variants, a,b. a has duration 100, occurs 1 time, b has duration 10, occurs 110 times
        #b will be the variant with greatest time
        variants,a = pm4py.statistics.variants.log.get.get_variants_along_with_case_durations(log)
        SumTimeSortedDict = a
        totalTime = 0
        for key, value in a.items():
            sum = np.sum(value)
            SumTimeSortedDict[key] = sum
            totalTime +=sum
        SumTimeSortedDict= dict(sorted(SumTimeSortedDict.items(), key=lambda item: item[1],reverse=True ))
        slowestVariantTotal = list(SumTimeSortedDict.keys())[0]
        time = SumTimeSortedDict[slowestVariantTotal]
        relativeTime = time/(totalTime)*100
        variantNumber = variants[slowestVariantTotal][0]._get_attributes()['concept:name']
       
        #return the slowstVariant by sum of time, 
        # its variant numer
        # with the sum of time 
        #and the relativetime to other variants in #seconds
        
        print("get_longest_total_duration complete")
        return [slowestVariantTotal,time, relativeTime, variantNumber]

    def get_shortest_total_duration(self, log): 
        print("Executing get_shortest_total_duration")
        #returns the sum of a variant with the greatest time
        #in this way both frequency and time is taken into account.
        #example 2 variants, a,b. a has duration 100, occurs 1 time, b has duration 10, occurs 110 times
        #b will be the variant with greatest time
        variants,a = pm4py.statistics.variants.log.get.get_variants_along_with_case_durations(log)
        SumTimeSortedDict = a
        totalTime = 0
        for key, value in a.items():
            sum = np.sum(value)
            SumTimeSortedDict[key] = sum
            totalTime +=sum
        SumTimeSortedDict= dict(sorted(SumTimeSortedDict.items(), key=lambda item: item[1],reverse=False ))
        FastestVariantTotal = list(SumTimeSortedDict.keys())[0]
        time = SumTimeSortedDict[FastestVariantTotal]
        relativeTime = time/(totalTime)*100
        variantNumber = variants[FastestVariantTotal][0]._get_attributes()['concept:name']
       
        #return the slowstVariant by sum of time, 
        # its variant numer
        # with the sum of time 
        #and the relativetime to other variants in #seconds
        
        print("get_shortest_total_duration complete")
        return [FastestVariantTotal,time, relativeTime, variantNumber]

        #below is currently never used, but should be
    def get_algorithm_precision(self,log, net, initialMarking, finalMarking): #how much of the model is observed in the log
        prec = precision_evaluator.apply(log, net, initialMarking, finalMarking, variant=precision_evaluator.Variants.ETCONFORMANCE_TOKEN)
                                    
    def get_log_skeleton_conformance(self,log):
    # gets the dataframe out of the event log (through conversion)
        dataframe = pm4py.convert_to_dataframe(log)
    # discovers the log skeleton model
        log_skeleton = log_skeleton_discovery.apply(log, parameters={log_skeleton_discovery.Variants.CLASSIC.value.Parameters.NOISE_THRESHOLD: 0.03})
    # apply conformance checking
        conf_result = log_skeleton_conformance.apply(log, log_skeleton)
    # gets the diagnostic result out of the dataframe
        diagnostics = log_skeleton_conformance.get_diagnostics_dataframe(log, conf_result)
    # merges the dataframe containing the events, and the diagnostics dataframe, using the pd.merge method
        merged_df = pd.merge(dataframe, diagnostics, how="left", left_on="case:concept:name", right_on="case_id", suffixes=('', '_diagn'))
        meanFitness = mean(merged_df["dev_fitness"])
        merged_df.sort_values('dev_fitness')
        

        case_list = {}
        activity_list = {}
        fitness_list = {}

        skeletonOutput = {}
        skeletonOutput['activities_with_worst_fitness'] = []
        for i in range(5):
            if(merged_df['dev_fitness'].iloc[i]<1):
                dict = {}
                dict["case"] = merged_df['case_id'].iloc[i]
                dict["activity"] = merged_df['concept:name'].iloc[i]
                dict["fitness"] = merged_df['dev_fitness'].iloc[i]
                skeletonOutput['activities_with_worst_fitness'].append(dict)


        skeletonOutput['mean_fitness'] = meanFitness
        return skeletonOutput # [meanFitness,total]

    #returns soundness true or false of petri net model
    #
    def get_soundness(self,net,initialMarking,finalMarking):
        # somewhere to store output
# set stdout to our StringIO instance

        is_sound, dictio_diagnostics= woflan.apply(net, initialMarking, finalMarking, parameters={woflan.Parameters.RETURN_ASAP_WHEN_NOT_SOUND: False,
        woflan.Parameters.PRINT_DIAGNOSTICS: True,
        woflan.Parameters.RETURN_DIAGNOSTICS: True})

        print("newline")
        print(type(dictio_diagnostics))
        # print something (nothing will print)

# restore stdout so we can really print (__stdout__ stores the original stdout)

# print the stored value from previous print
   
        #print("soundness is, ", is_sound)
       # print("dict vals is, ", dictio_diagnostics)
        print("newline")
        for vals in dictio_diagnostics:
            print(vals)
            #for x in enumerate(key):
            #    print(" x is ", x)
            #if "res" in key:
            #print("key = ", key.)
            #if "res" in value:
            #    print(" val = ", value)
        #if dictio_diagnostics['dead_tasks']:
       #     print("deadlock at: ", dictio_diagnostics['dead_tasks'])
       # else:
       #     print("deadlock free")
        #deadlock, if empty deadlock free, 
        #dictio_diagnostics['mcg']





        #   for k in dictio_diagnostics.items():

     #      print(k)
       # returnvals = [dictio_diagnostics['dead_tasks']]
            

    def trim(self, log, percentage):
        log =  variants_filter.filter_log_variants_percentage(log, percentage)
        resources = attributes_filter.get_attribute_values(log, "concept:name")
        #print(resources)
        #log = attributes_filter.apply(log, ["Time"], {attributes_filter.Parameters.POSITIVE: True})
        return log
    
    def cleanLog(self, algorithm, log, logName, algorithmParams):

        #self.remove_unnecessary_paths(log)
        BestMinerName = self.suggest_best_algorithm(logName, log, algorithmParams)
        imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm(BestMinerName, logName, log, algorithmParams)
        BestMinerFitness = self.get_algorithm_fitness(log, generatedPetriNet, initialMarking, finalMarking)

        if algorithm is None:
            imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm(algorithm, logName, log, algorithmParams)
            InitialFitness = self.get_algorithm_fitness(log, generatedPetriNet, initialMarking, finalMarking)
        else:
            InitialFitness = BestMinerFitness
        
        CurrentFitness = InitialFitness
        BestFitness = InitialFitness
        newLog = log

        TrimValues = {}

        for percentage in range(10, 100+1, 10):
            newLog = self.trim(log, percentage/100)
            imgPath, generatedPetriNet, initialMarking, finalMarking = self.applyAlgorithm(BestMinerName, logName, log, algorithmParams)
            TrimValues[percentage] = self.get_algorithm_fitness(newLog, generatedPetriNet, initialMarking, finalMarking)
        
        CurrentFitness = max(TrimValues)


        return log

    def search(self, values, searchFor):
        for k in values:
            if searchFor in k:
                return k
        return None
    
    def matchingValues(self, dictionary, searchString):
        return [val for val in dictionary.values() if any(searchString in s for s in val)]
    
    def unnecessary_paths(self, log):
        list = pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log))

        maxList = []
        minList = []
        for var in range(0, 5):
            maxList.append(list[var])
            # print(list[var])
        for var in range(len(list)-5, len(list)):
            minList.append(list[var])
            # print(list[var])
        return minList, maxList

    def remove_variant(self, variants, string):
        keyToDelete = list()
        for key, value in variants.items():
            if key == string:
                keyToDelete.append(key)
                #del variants[key]
        for key in keyToDelete:
            del variants[key]
        return variants
    
    def remove_unnecessary(self, log):
        variants = pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log))
        variantsDict = variants_filter.get_variants(log)

        lowVariants = list()
        highVariants = list()
        for variant in variants:
            procentage = self.get_variant_percentage(log, variant[0])
            if procentage <= 0.2:
                lowVariants.append(variant)
            if procentage >= 0.404:
                highVariants.append(variant)
            
        highVariantsConv = list()
        for key in highVariants:
            highVariantsConv.append(key[0])
        
        low = list()
        for key in lowVariants:
            low.append(key[0])
        
        high = list()
        for key in highVariants:
            high.append(key[0])
        
        matching = list()
        for key in low:
            matching.append([s for s in high if key in s])
        
        for key in matching:
            self.remove_variant(variantsDict, key)
        
        log = variants_filter.apply(log, variantsDict, parameters={variants_filter.Parameters.POSITIVE: True})

        return log
                

    def remove_unnecessary_paths(self, log, min = 0, max = 1):
        vardel = []
        variantsDict = variants_filter.get_variants(log)
        variantsList = pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log))
        if(min == 1):
            self.remove_variant(variantsDict, variantsList.pop(len(variantsList)-1)[0])
        if(max == 1):
            self.remove_variant(variantsDict, variantsList.pop(0)[0])
        log = variants_filter.apply(log, variantsDict, parameters={variants_filter.Parameters.POSITIVE: True})

        res = self.get_shortest_total_duration(log)[0]

        self.remove_variant(variantsDict, res)
        return log
        
        variants2 = pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log2))

        return min(pm4py.statistics.variants.log.get.get_variants_sorted_by_count(variants_filter.get_variants(log)))
        #TODO Complete function (return a cleaned log)
        #Compare if bottlenecks in longestPath
        self.get_bottlenecks(log)
        self.get_longest_path_in_log(log)

        bottleNecks = potentialBottleNecks
        longestPaths = MeanTimeSortedDict

        # bottleNecksList = list()
        # for key in bottleNecks:
        #     l = key.split(',')
        #     for key2 in l:
        #           bottleNecksList.append(key2)  

        bottleNecksList = list()
        for key in bottleNecks:
            bottleNecksList.append(key['name'])

        # longestPathsList = list()
        # for key in longestPaths:
        #     l = key.split(',')
        #     #print(key)
        #     for key2 in l:
        #         longestPathsList.append(key2)
            
        longestPathsList = list()
        for key in longestPaths.keys():
            longestPathsList.append(key)
        
        matching = list()
        for key in bottleNecksList:
            matching.append([s for s in longestPathsList if key in s])
        
        for i in range(len(longestPaths.keys())):
            print(longestPaths.get(i))
            #match=re.search(r'Mary', longestPaths.values()[i])
                #if match:
                #    print match.group() #Mary
                #    print longestPaths.keys()[i] #firstName
                #    print longestPaths.values()[i][j] #Mary-Ann
        new_dict = dict((k, v) for k, v in longestPaths.iterkeys() if v in bottleNecksList)
        ass = list()
        for idx, key in enumerate(bottleNecksList):
            res = self.matchingValues(longestPaths, key)
            if res is not None:
                ass.append(res)


        for lpl in bottleNecksList:
            #for bnl in bottleNecksList:
            if lpl in longestPaths:
                print(lpl)
        
        lp = set(longestPathsList)
        lf = list(filter(lambda x: x in bottleNecksList , longestPathsList))
        #for x in bottleNecksList if x in lp:
            #print(x)
        #ints = lp.intersection(longestPathsList)
            
        #d2 = {key: list(map(str, key.split(','))) for key, value in longestPaths.items()}
        #iSet = set(d2)
        #intersection.append(iSet.intersection(bottleNecks))
        intersectionList = list(intersection)
        print(intersection)
        return 0

    def compare_logs(self, log1, log2):
        #TODO complete log
        #compare algorithms as get_algorithm_fitness, ect => best log
        longestPathLog1 = self.get_longest_path_in_log(log1)
        bestAlgorithmLog1 = self.suggest_best_algorithm(log1)
        bottleNecksLog1 = self.get_bottlenecks(log1)

        longestPathLog2 = self.get_longest_path_in_log(log2)
        bestAlgorithmLog2 = self.suggest_best_algorithm(log2)
        bottleNecksLog2 = self.get_bottlenecks(log2)
        return 0

    def caseSizeFiler(self, log, MinSize, MaxSize):
        return pm4py.filter_case_size(log, int(MinSize), int(MaxSize))
    
    def TimeFiler(self, log, startTime, endTime):
        #log = self.get_log(log)
        #log = dataframe_utils.convert_timestamp_columns_in_df(log)
        #return timestamp_filter.filter_traces_contained(log, startTime, endTime)
        return timestamp_filter.filter_traces_contained(log, startTime, endTime)
    
    def saveXES(self, log, command):
        pm4py.write_xes(log, './logs/result.xes')
        return jsonify({'Arg' : command})


    # def save_petrinet_alpha_miner(logName):
    #     pathToLog = log_path + logName
    #     log = xes_importer.apply(pathToLog)
    #     net, initialMarking, finalMarking = alphaMiner.apply(log)
    #     gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY, log=log)
    #     pn_visualizer.save(gviz, imgPath + logName.split('.')[0] + '.jpg')

    # def save_petrinet_heuritic_miner(logName):
    #     pathToLog = log_path + logName
    #     log = xes_importer.apply(pathToLog)
    #     net, initialMarking, finalMarking = heuristicsMiner.apply(log)
    #     gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY, log=log)
    #     pn_visualizer.save(gviz, imgPath + logName.split('.')[0] + '.jpg')
        
    # def save_petrinet_inductive_miner(logName):
    #     pathToLog = log_path + logName
    #     log = xes_importer.apply(pathToLog)
    #     net, initialMarking, finalMarking = inductiveMiner.apply(log)
    #     gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY, log=log)
    #     pn_visualizer.save(gviz, imgPath + logName.split('.')[0] + '.jpg')


    # def doStuff(self, logName):
    #     pathToLog = log_path + logName
    #     log = xes_importer.apply(pathToLog)
    #     net, initialMarking, finalMarking = alpha_miner.apply(log)
    #     gviz = pn_visualizer.apply(net, initialMarking, finalMarking, parameters=None, variant=pn_visualizer.Variants.FREQUENCY, log=log)
    #     # gviz = pn_visualizer.apply(net, initialMarking, finalMarking)   # Visualization without frequency of nodes. Must be used instead of the line above
        
    #     pn_visualizer.save(gviz, imgPath + logName.split('.')[0] + '.jpg')    # Saves the petrinet as an image
    #     # pn_visualizer.save(gviz, imgPath + os.path.basename(pathToLog).split('.')[0] + '.jpg')   # Same as the line above, but is useful if we need to specify the entire path instead. pathToLog = log_path + logName
    #     # pn_visualizer.view(gviz)                                          # Comment this back in to show an imagepython pip3

 # def init_activity_connection_data(self, dfg, activities):
    #     # Return dict with activity(string) mapped to (int)list of length==2
    #     #  String          int              int     
    #     # {activity, [incommingEdges, outgoingEdges]}
    #     acitivityConnectionData = dict()
    #     for acivity in activities:
    #         acitivityConnectionData[acivity] = [0,0] #[incomming, outgoing]
    #     for key in dfg:
    #         acitivityConnectionData[key[0]][1] += dfg[key] #Outgoing
    #         acitivityConnectionData[key[1]][0] += dfg[key] #Incomming
    #     return acitivityConnectionData

    # def get_start_activities(self, activityConnectionData):
    #     # Returns a string-list of activities with no incomming edges
    #     startActivities = list()
    #     for activity in activityConnectionData:
    #         if activityConnectionData[activity][0] == 0: #If incomming edges is 0
    #             startActivities.append(activity)
    #     return startActivities

    # def get_end_activities(self, activityConnectionData):
    #     # Returns a string-list of activities with no outgoing edges
    #     endActivities = list()
    #     for activity in activityConnectionData:
    #         if activityConnectionData[activity][1] == 0: #If outgoing edges is 0
    #             endActivities.append(activity)
    #     return endActivities

    # def get_activities_list(self, log):
    #     # Returns a string-list of all activities
    #     return pm4py.statistics.attributes.log.get.get_attribute_values(log, "concept:name")

    # def get_all_trace_attributes(log):
    #     return pm4py.statistics.attributes.log.get.get_all_trace_attributes_from_log(log)
    
    # def get_all_event_attributes(log):
    #     return pm4py.statistics.attributes.log.get.get_all_event_attributes_from_log(log)

       # def get_longest_path_in_log(self, log):
  #      longestRoute = 0 #King of the hill (save the current longest route)
  #      for trace in log:
            # if longestRoute < newRoute : longestRoute = newRoute
  ##          for event in trace:
#             slet_mig = 0
                #Find newRoute
        #Alternatively, use a dictionary to save alview_performance_spectruml times in traces, and analyse it to find the longest route.