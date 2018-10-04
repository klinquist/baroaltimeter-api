const Nodecache = require('node-cache');
const geohash = require('ngeohash');
const cache = new Nodecache({
    stdTTL: 604800
});
const pressureCache = new Nodecache({
    stdTTL: 120
});
const errorCache = new Nodecache({
    stdTTL: 86400
});
const wu = new require('./lib/wu')({
    apiKey: 'xxxxxxx'
});
const restify = require('restify');
const server = restify.createServer();

const cl = (logMsg) => {
    console.log(`${new Date().toISOString()} ${logMsg}`);
};


//For server status checks
server.get('/status', (err, res) => {
    res.send(200);
});


server.get('/findairport/:lat/:long', (req, res) => {
    if (!req.params || !req.params.lat || !req.params.long) return res.send(500);
    cl(`${req.connection.remoteAddress} Received request to find airport for ${req.params.lat},${req.params.long}`);
    const latLongHash = geohash.encode(req.params.lat, req.params.long, 6);
    if (latLongHash == '000000') {
        return res.send(500, {
            error: 'invalid lat/long'
        });
    }
    const cacheResult = cache.get(latLongHash);
    const err = errorCache.get(latLongHash);
    if (cacheResult) {
        cl(`Returning result from cache: ${JSON.stringify(cacheResult)}`);
        return res.send(200, {
            icao: cacheResult
        });
    } else if (err) {
        cl(`Returning result from ERROR cache: ${JSON.stringify(err)}`);
        return res.send(500, {
            error: err
        });
    } else {
        cl('Returning result from WU');
        wu.findICAO(req.params.lat, req.params.long, (err, result) => {
            if (err) {
                cl(`Error from wu: ${err}`);
                //Also cache errors to avoid abuse
                errorCache.set(latLongHash, err);
                return res.send(500);
            }
            cl(`ICAO result ${result}`);
            cache.set(latLongHash, result);
            res.send(200, {
                icao: result
            });
        });
    }
});

server.get('/getairportdata/:icao', (req, res) => {
    if (!req.params || !req.params.icao) return res.send(500);
    cl(`${req.connection.remoteAddress} Received request to get airport data for ${req.params.icao}`);
    if (req.params.icao.length > 5) {
        return res.send(500, {
            error: 'invalid ICAO'
        });
    }
    const cacheResult = pressureCache.get(req.params.icao);
    const err = errorCache.get(req.params.icao);
    if (cacheResult) {
        cl(`Returning pressure result from cache: ${JSON.stringify(cacheResult)}`);
        return res.send(200, {
            data: cacheResult
        });
    } else if (err) {
        cl(`Returning ERROR result from cache: ${JSON.stringify(err)}`);
        return res.send(500, {
            error: err
        });
    } else {
        wu.getAirportData(req.params.icao, (err, result) => {
            if (err) {
                cl(`Error from wu: ${err}`);
                //Also cache errors to avoid abuse
                errorCache.set(req.params.icao, err);
                return res.send(500, {
                    error: err
                });
            }
            pressureCache.set(req.params.icao, result);
            cl(`Returning airport data result: ${JSON.stringify(result)}`);
            res.send(200, {
                data: result
            });
        });
    }
});


console.log('Listening on port 3000');
server.listen(3000);