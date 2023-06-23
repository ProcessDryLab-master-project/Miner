const validStructure = {
    "MinerId": {
        "type": "string",
        "required": true
    },
    "MinerLabel": {
        "type": "string",
        "required": true
    },
    "Type": {
        "type": "string",
        "required": true
    },
    "MinerPath": {
        "type": "string",
        "required": true
    },
    "MinerFile": {
        "type": "string",
        "required": true
    },
    "Access": {
        "type": "string",
        "required": false
    },
    "Shadow": {
        "type": "boolean",
        "required": false
    },
    "ResourceInput": {
        "type": "array",
        "required": false,
        "itemStructure": {
            "Name": {
                "type": "string",
                "required": true
            },
            "FileExtension": {
                "type": "string",
                "required": false
            },
            "ResourceType": {
                "type": "string",
                "required": true
            }
        }
    },
    "ResourceOutput": {
        "type": "object",
        "required": true,
        "itemStructure": {
            "FileExtension": {
                "type": "string",
                "required": true
            },
            "ResourceType": {
                "type": "string",
                "required": true
            }
        },
    },
    "MinerParameters": {
        "type": "array",
        "required": false,
        "itemStructure": {
            "Name": {
                "type": "string",
                "required": true
            },
            "Type": {
                "type": "string",
                "required": true
            },
            "Min": {
                "type": "number",
                "required": false
            },
            "Max": {
                "type": "number",
                "required": false
            },
            "Default": {
                "type": "number",
                "required": false
            },
            "Description": {
                "type": "string",
                "required": false
            }
        },
    }
};

function validateConfig(config) {

    function validateStructure(config, validStructure, parentObjectKey = null) {
        let valid = true;
        Object.keys(validStructure).forEach(key => {
            if(validStructure[key].type === "array" && validStructure[key].required && Array.isArray(config[key])) {
                config[key].forEach(element => {
                    valid = validateStructure(element, validStructure[key].itemStructure, key);
                });
            }
            else if(validStructure[key].type === "array" && validStructure[key].required && typeof config[key] === "object") {
                valid = validateStructure(config[key], validStructure[key].itemStructure, key);
            }
            else if(config[key] == null && validStructure[key].required) {
                if(parentObjectKey != null) {
                    console.error(`Err: Missing required key '${key}' in config.json at '${parentObjectKey}' is missing. Please follow the structure`);
                    console.log(validStructure);
                } else {
                    console.error(`Err: Missing required key '${key}' in config.json`);
                }
                valid = false;
            }
        });
        return valid;
    }

    return validateStructure(config, validStructure);
} 

function checkUniqueMinerIds(configList){
    const lookup = configList.reduce((configList, configElement) => {
        configList[configElement.MinerId] = ++configList[configElement.MinerId] || 0;
        return configList;
    }, {});
    let duplicateIdObj = configList.filter(configElement => lookup[configElement.MinerId]);
    if(duplicateIdObj.length > 0){
        console.error(`Err: Duplicate 'MinerId' found in config.json ${dublicateIdObj}`);
        return false;
    }
    return true;
}

export function verifyConfig(configList){

    if(configList.length === 0){ // Check if configList is empty
        console.log(`No miner configurations found`);
        return true;
    }

    if(!checkUniqueMinerIds(configList)){ // Check for duplicate MinerIds
        return false;
    }

    const allConfigValid = !configList.map(config => { // Check for valid config structure
        return validateConfig(config)
    }).includes(false);
    return allConfigValid;
}