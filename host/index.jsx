#target "aftereffects"
#include "json2.js"

function sayHello() {
    alert("Hello from ExtendScript!");
}

function getActiveCompName() {
    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) {
        return comp.name;
    }
    return "No active composition.";
}

function updateTextLayer(layerName, newText) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Error: Please select a composition.");
        return;
    }

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer.name === layerName && layer instanceof TextLayer) {
            layer.property("Source Text").setValue(newText);
            alert("Updated layer '" + layerName + "'.");
            return;
        }
    }

    alert("Error: Text layer '" + layerName + "' not found.");
}

function main(json_string) {
    try {
        var request = JSON.parse(json_string);
        var func_name = request.func;
        var args = request.args || [];

        // Check if the function exists in the global scope
        if (typeof $ !== 'undefined' && typeof $.global[func_name] === 'function') {
            var result = $.global[func_name].apply(null, args);
            return JSON.stringify({ status: "success", data: result });
        } else {
            throw new Error("Function " + func_name + " not found.");
        }
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}