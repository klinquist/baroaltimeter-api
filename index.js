const Nodecache = require('node-cache');
const geohash = require('ngeohash');
const cache = new Nodecache({ stdTTL: 604800 });
const wu = new require('./lib/wu')({
    apiKey: 'xxxxxxx'
});
const restify = require('restify');
const server = restify.createServer();

const cl = (logMsg) => {
    console.log(`${new Date().toISOString()} ${logMsg}`);
};

server.get('/findairport/:lat/:long', (req, res) => {
    if (!req.params || !req.params.lat || !req.params.long) return res.send(500);
    cl(`${req.connection.remoteAddress} Received request to find airport for ${req.params.lat},${req.params.long}`);
    const latLongHash = geohash.encode(req.params.lat, req.params.long, 6);
    const cacheResult = cache.get(latLongHash);
    if (cacheResult) {
        cl(`Returning result from cache: ${cacheResult}`);
        res.send(200, {
            icao: cacheResult
        });
    } else {
        cl('Returning result from WU');
        wu.findICAO(req.params.lat, req.params.long, (err, result) => {
            if (err) {
                cl(`Error from wu: ${err}`);
                return res.send(500);
            }
            cl(`ICAO result ${result}`);
            cache.set(latLongHash, result);
            res.send(200, { icao: result });
        });
    }
});

server.get('/getairportdata/:icao', (req, res) => {
    if (!req.params || !req.params.icao) return res.send(500);
    cl(`${req.connection.remoteAddress} Received request to get airport data for ${req.params.icao}`);
    wu.getAirportData(req.params.icao, (err, result) => {
        if (err) {
            cl(`Error from wu: ${err}`);
            return res.send(500);
        }
        cl(`Returning airport data result: ${JSON.stringify(result)}`);
        res.send(200, {data: result});
    });
});


console.log('Listening on port 3000');
server.listen(3000);
