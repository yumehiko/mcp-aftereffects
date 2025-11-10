function log(message) {
    var timestamp = new Date().toUTCString();
    var line = "[" + timestamp + "] " + message + "\n";
    try {
        if (!log.file) {
            var folder = new Folder("~/Documents/LLMVideoAgentLogs");
            if (!folder.exists) {
                folder.create();
            }
            log.file = new File(folder.fsName + "/host.log");
        }
        if (log.file.open("a")) {
            log.file.write(line);
            log.file.close();
        }
    } catch (e) {
        // ファイル書き込みに失敗しても ExtendScript コンソールへ出力する。
    }
    try {
        $.writeln("[LLM Video Agent] " + line);
    } catch (err) {}
}

function encodePayload(data) {
    try {
        var encoded = "__ENC__" + encodeURIComponent(JSON.stringify(data));
        return encoded;
    } catch (e) {
        log("encodePayload() failed: " + e.toString());
        return JSON.stringify({ status: "Error", message: "encodePayload failed: " + e.toString() });
    }
}

function getLayerTypeName(layer) {
    if (layer instanceof TextLayer) {
        return "Text";
    } else if (layer instanceof ShapeLayer) {
        return "Shape";
    } else if (layer instanceof AVLayer) {
        if (layer.source instanceof CompItem) {
            return "PreComp";
        } else if (layer.hasVideo && !layer.hasAudio) {
            return "Video";
        } else if (!layer.hasVideo && layer.hasAudio) {
            return "Audio";
        } else if (layer.source && layer.source.mainSource instanceof SolidSource) {
            return "Solid";
        } else {
            return "AVLayer";
        }
    } else if (layer instanceof CameraLayer) {
        return "Camera";
    } else if (layer instanceof LightLayer) {
        return "Light";
    }
    return "Unknown";
}

function getLayers() {
    try {
        ensureJSON();
        log("getLayers() called.");
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            log("getLayers(): No active composition.");
            return encodePayload({ "status": "error", "message": "Active composition not found." });
        }

        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            layers.push({
                id: layer.index,
                name: layer.name,
                type: getLayerTypeName(layer)
            });
        }
        var payload = encodePayload(layers);
        log("getLayers(): returning payload length " + payload.length);
        return payload;
    } catch (e) {
        log("getLayers() threw: " + e.toString());
        return encodePayload({ "status": "error", "message": e.toString() });
    }
}

function getProperties(layerId) {
    try {
        ensureJSON();
        log("getProperties(" + layerId + ") called.");
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            log("getProperties(): No active composition.");
            return encodePayload({ status: "Error", message: "Active composition not found." });
        }
        var layer = comp.layer(layerId);
        if (!layer) {
            log("getProperties(): layer " + layerId + " not found.");
            return encodePayload({ status: "Error", message: "Layer with id " + layerId + " not found." });
        }

        var properties = [];

        // NOTE: Using literal numbers for property types because the global constants 
        // (PropertyType.PROPERTY, PropertyType.GROUP) were found to be unreliable in the ExtendScript context.
        // 6212 corresponds to PropertyType.PROPERTY
        // 6213 corresponds to PropertyType.GROUP
        var PROPERTY_TYPE_PROPERTY = 6212;
        var PROPERTY_TYPE_GROUP = 6213;

        function scanProperties(propGroup, pathPrefix) {
            for (var i = 1; i <= propGroup.numProperties; i++) {
                var prop = propGroup.property(i);
                if (!prop) continue;

                var currentPath = pathPrefix ? pathPrefix + "." + prop.matchName : prop.matchName;

                if (prop.propertyType === PROPERTY_TYPE_PROPERTY) {
                    properties.push({
                        name: prop.name,
                        path: currentPath,
                        value: prop.value.toString(),
                        hasExpression: prop.expressionEnabled
                    });
                } else if (prop.propertyType === PROPERTY_TYPE_GROUP) {
                    scanProperties(prop, currentPath);
                }
            }
        }

        var groupsToScan = ["ADBE Transform Group", "ADBE Effect Parade", "ADBE Text Properties", "ADBE Marker"];
        for (var i = 0; i < groupsToScan.length; i++) {
            var groupMatchName = groupsToScan[i];
            try {
                var propGroup = layer.property(groupMatchName);
                if (propGroup) {
                    if (propGroup.propertyType === PROPERTY_TYPE_GROUP) {
                        scanProperties(propGroup, propGroup.matchName);
                    } else if (propGroup.propertyType === PROPERTY_TYPE_PROPERTY) {
                        properties.push({
                            name: propGroup.name,
                            path: propGroup.matchName,
                            value: propGroup.value.toString(),
                            hasExpression: propGroup.expressionEnabled
                        });
                    }
                }
            } catch (e) {
                // Property group does not exist on this layer type, which is fine.
            }
        }

        var payload = encodePayload(properties);
        log("getProperties(): returning payload length " + payload.length);
        return payload;
    } catch (e) {
        log("getProperties() threw: " + e.toString());
        return encodePayload({ status: "Error", message: e.toString() });
    }
}

function resolveProperty(layer, path) {
    var parts = path.split('.');
    var prop = layer;
    for (var i = 0; i < parts.length; i++) {
        prop = prop.property(parts[i]);
        if (!prop) {
            return null;
        }
    }
    return prop;
}

function setExpression(layerId, propertyPath, expression) {
    try {
        ensureJSON();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "Error: Active composition not found.";
        }

        var layer = comp.layer(layerId);
        if (!layer) {
            return "Error: Layer with id " + layerId + " not found.";
        }

        var prop = resolveProperty(layer, propertyPath);
        if (!prop) {
            return "Error: Property with path '" + propertyPath + "' not found.";
        }

        if (prop.canSetExpression) {
            prop.expression = expression;
            return "success";
        } else {
            return "Error: Cannot set expression on property '" + prop.name + "'.";
        }
    } catch (e) {
        return "Error: " + e.toString();
    }
}
function ensureJSON() {
    if (typeof JSON === "undefined" || typeof JSON.stringify !== "function") {
        $.evalFile(File(Folder(app.path).fsName + "/Scripts/json2.js"));
    }
}
