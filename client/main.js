
const http = require('http');
const fs = require('fs');
const path = require('path');

// CEP-Spyを参考に、CSInterface.jsのパスを解決
// https://github.com/Adobe-CEP/CEP-Spy/blob/master/spy/index.html#L32
const csInterface = new CSInterface();
const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);


function escapeForExtendScript(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const hostScriptPath = escapeForExtendScript(path.join(extensionRoot, 'host', 'index.jsx'));

function evalHostScript(scriptSource, callback) {
    log(`evalHostScript: $.evalFile("${hostScriptPath}")`);
    const fullScript = `$.evalFile("${hostScriptPath}");${scriptSource}`;
    csInterface.evalScript(fullScript, callback);
}

function log(message) {
    const logTextarea = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();
    logTextarea.value = `${timestamp}: ${message}\n` + logTextarea.value;
}

const ENCODE_PREFIX = '__ENC__';

function parseBridgeResult(result) {
    if (typeof result !== 'string' || result.length === 0) {
        throw new Error('ExtendScript returned an empty result.');
    }

    let decoded = result;
    if (result.startsWith(ENCODE_PREFIX)) {
        const encodedPayload = result.slice(ENCODE_PREFIX.length);
        try {
            decoded = decodeURIComponent(encodedPayload);
        } catch (e) {
            throw new Error(`Failed to decode ExtendScript payload: ${e.toString()}`);
        }
    }

    return JSON.parse(decoded);
}

const server = http.createServer((req, res) => {
    log(`Request received: ${req.method} ${req.url}`);

    // CORS preflight request
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const [pathname, queryString = ''] = req.url.split('?');
    const method = (req.method || 'GET').toUpperCase();
    const searchParams = new URLSearchParams(queryString);

    if (pathname === '/health' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        log('Health check responded with ok.');
    } else if (pathname === '/layers' && method === 'GET') {
        handleGetLayers(req, res);
    } else if (pathname === '/properties' && method === 'GET') {
        handleGetProperties(searchParams, res);
    } else if (pathname === '/expression' && method === 'POST') {
        handleSetExpression(req, res);
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
        log(`404 Not Found: ${req.method} ${req.url}`);
    }
});

function handleGetLayers(req, res) {
    log('Calling ExtendScript: getLayers()');
    evalHostScript('getLayers()', (result) => {
        try {
            const parsedResult = parseBridgeResult(result);
            log(`getLayers() raw result length: ${result ? result.length : 0}`);
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'success', data: parsedResult }));
            log('getLayers() successful.');
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ status: 'error', message: 'Failed to parse ExtendScript result.', error: e.toString(), rawResult: result }));
            log(`getLayers() failed: ${e.toString()} raw="${result}"`);
        }
    });
}

function handleGetProperties(searchParams, res) {
    const layerId = searchParams.get('layerId');
    if (!layerId) {
        res.writeHead(400);
        res.end(JSON.stringify({ status: 'error', message: 'Missing layerId parameter' }));
        log('getProperties failed: Missing layerId');
        return;
    }

    log(`Calling ExtendScript: getProperties(${layerId})`);
    evalHostScript(`getProperties(${layerId})`, (result) => {
        try {
            const parsedResult = parseBridgeResult(result);
            log(`getProperties(${layerId}) raw result length: ${result ? result.length : 0}`);
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'success', data: parsedResult }));
            log(`getProperties(${layerId}) successful.`);
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ status: 'error', message: 'Failed to parse ExtendScript result.', error: e.toString(), rawResult: result }));
            log(`getProperties(${layerId}) failed: ${e.toString()} raw="${result}"`);
        }
    });
}

function handleSetExpression(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const { layerId, propertyPath, expression } = JSON.parse(body);
            if (!layerId || !propertyPath || expression === undefined) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'Missing parameters' }));
                log('setExpression failed: Missing parameters');
                return;
            }

            const script = `setExpression(${layerId}, "${propertyPath}", '${expression.replace(/'/g, "'")}')`;
            log(`Calling ExtendScript: ${script}`);
            evalHostScript(script, (result) => {
                if (result === 'success') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ status: 'success', message: 'Expression set successfully' }));
                    log('setExpression successful.');
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ status: 'error', message: result }));
                    log(`setExpression failed: ${result}`);
                }
            });
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON', error: e.toString() }));
            log(`setExpression failed: Invalid JSON - ${e.toString()}`);
        }
    });
}


const port = 8080;
server.listen(port, '127.0.0.1', () => {
    log(`Server listening on http://127.0.0.1:${port}`);
});

log('main.js loaded.');
