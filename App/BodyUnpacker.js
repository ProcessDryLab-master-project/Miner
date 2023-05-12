// Miner request body unpackers
export function getBodyInput(body) {
  return body.Input;
}

export function getBodyAllMetadata(body) {
  return getBodyInput(body).Resources;
}

export function getBodySingleMetadata(body, key) {
  return getBodyAllMetadata(body)[key];
}

export function getBodyOutput(body) {
  return body.Output;
}

export function getBodyOutputHost(body) {
  return getBodyOutput(body).Host;
}

export function getBodyOutputHostInit(body) {
  return getBodyOutput(body).HostInit;
}

export function getBodyOutputLabel(body) {
  return getBodyOutput(body).ResourceLabel;
}

export function getBodyOutputTopic(body) {
  return getBodyOutput(body).StreamTopic;
}

export function getBodyOutputOverwrite(body) {
  return getBodyOutput(body).Overwrite;
}

export function getBodyMinerId(body) {
  return body.MinerId;
}

export function hasStreamInput(body) {
  for (let key in getBodyAllMetadata(body)) {
    if (metadataIsStream(getBodySingleMetadata(body, key))) return true;
  }
  return false;
}

// Metadata unpackers
export function metadataIsStream(metadataObject) {
  return getMetadataResourceType(metadataObject) == "EventStream";
}

export function getMetadataResourceId(metadataObject) {
  return metadataObject.ResourceId;
}
export function getMetadataResourceInfo(metadataObject) {
  return metadataObject.ResourceInfo;
}
export function getMetadataResourceType(metadataObject) {
  return getMetadataResourceInfo(metadataObject).ResourceType;
}

export function getMetadataFileExtension(metadataObject) {
  return getMetadataResourceInfo(metadataObject).FileExtension;
}

export function getMetadataHost(metadataObject) {
  return getMetadataResourceInfo(metadataObject).Host;
}