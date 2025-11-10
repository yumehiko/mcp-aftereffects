function log(message) {
    try {
        $.writeln("[LLM Video Agent] " + message);
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
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            log("getLayers(): Active composition not found.");
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
        return encodePayload(layers);
    } catch (e) {
        log("getLayers() threw: " + e.toString());
        return encodePayload({ "status": "error", "message": e.toString() });
    }
}

function getProperties(layerId) {
    try {
        ensureJSON();
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            log("getProperties(): Active composition not found.");
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

        function getPropertyIdentifier(prop, index) {
            try {
                if (prop.matchName && prop.matchName.length > 0) {
                    return prop.matchName;
                }
            } catch (e) {}
            try {
                if (prop.name && prop.name.length > 0) {
                    return prop.name;
                }
            } catch (e2) {}
            return "Property_" + index;
        }

        function propertyValueToString(prop) {
            try {
                var value = prop.value;
                if (value === null || value === undefined) {
                    return "";
                }
                if (value instanceof Array) {
                    return value.join(", ");
                }
                if (typeof value === "boolean") {
                    return value ? "true" : "false";
                }
                return value.toString();
            } catch (e) {
                return "";
            }
        }

        function canTraverse(prop) {
            if (!prop) {
                return false;
            }
            try {
                if (prop.propertyType === PROPERTY_TYPE_GROUP) {
                    return true;
                }
            } catch (e) {}
            return typeof prop.numProperties === "number" && prop.numProperties > 0;
        }

        function isPropertyNode(prop) {
            if (!prop) {
                return false;
            }
            try {
                if (prop.propertyType === PROPERTY_TYPE_PROPERTY) {
                    return true;
                }
            } catch (e) {}
            return !canTraverse(prop);
        }

        function scanProperties(propGroup, pathPrefix) {
            if (!propGroup || typeof propGroup.numProperties !== "number") {
                return;
            }
            for (var i = 1; i <= propGroup.numProperties; i++) {
                var prop = propGroup.property(i);
                if (!prop) {
                    continue;
                }

                var identifier = getPropertyIdentifier(prop, i);
                var currentPath = pathPrefix ? pathPrefix + "." + identifier : identifier;

                if (isPropertyNode(prop)) {
                    var hasExpression = false;
                    try {
                        hasExpression = prop.expressionEnabled;
                    } catch (e) {}
                    properties.push({
                        name: prop.name,
                        path: currentPath,
                        value: propertyValueToString(prop),
                        hasExpression: hasExpression
                    });
                }

                if (canTraverse(prop)) {
                    scanProperties(prop, currentPath);
                }
            }
        }

        scanProperties(layer, "");

        return encodePayload(properties);
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
        try {
            $.evalFile(File(Folder(app.path).fsName + "/Scripts/json2.js"));
            return;
        } catch (e) {
            // Fall through to local copy.
        }
        var scriptFolder = File($.fileName).parent;
        var localJson = File(scriptFolder.fsName + "/json2.js");
        if (!localJson.exists) {
            throw new Error("json2.js not found at " + localJson.fsName);
        }
        $.evalFile(localJson);
    }
}
