import pm4py
from flask import jsonify
class PMutil() :
    def init_activity_connection_data(dfg, activities):
        # Return dict with activity(string) mapped to (int)list of length==2
        #  String          int              int     
        # {activity, [incommingEdges, outgoingEdges]}
        acitivityConnectionData = dict()
        for acivity in activities:
            acitivityConnectionData[acivity] = [0,0] #[incomming, outgoing]
        for key in dfg:
            acitivityConnectionData[key[0]][1] += dfg[key] #Outgoing
            acitivityConnectionData[key[1]][0] += dfg[key] #Incomming
        return acitivityConnectionData

    def get_start_activities(activityConnectionData):
        # Returns a string-list of activities with no incomming edges
        startActivities = list()
        for activity in activityConnectionData:
            if activityConnectionData[activity][0] == 0: #If incomming edges is 0
                startActivities.append(activity)
        return startActivities

    def get_end_activities(activityConnectionData):
        # Returns a string-list of activities with no outgoing edges
        endActivities = list()
        for activity in activityConnectionData:
            if activityConnectionData[activity][1] == 0: #If outgoing edges is 0
                endActivities.append(activity)
        return endActivities

    def get_activities_list(log):
        # Returns a string-list of all activities
        return pm4py.statistics.attributes.log.get.get_attribute_values(log, "concept:name")

    def get_all_trace_attributes(log):
        return pm4py.statistics.attributes.log.get.get_all_trace_attributes_from_log(log)
    
    def get_all_event_attributes(log):
        return pm4py.statistics.attributes.log.get.get_all_event_attributes_from_log(log)