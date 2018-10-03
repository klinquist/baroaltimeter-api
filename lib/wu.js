const request = require('request').defaults({ json: true });



const WU = function (opts) {
    if (!(this instanceof WU)) return new WU(opts);
    const wuKey = opts.apiKey;
    this.findICAO = (lat, long, cb) => {
        request({
            method: 'GET',
            uri: `https://api.wunderground.com/api/${wuKey}/forecast/geolookup/conditions/q/${lat},${long}.json`
        }, (err, res, body) => {
            if (!body || !body.location || !body.location.nearby_weather_stations || !body.location.nearby_weather_stations.airport) return cb('Unable to find ICAO');
            return cb(null, body.location.nearby_weather_stations.airport.station[0].icao);
        });
    };
    this.getAirportData = (icao, cb) => {
        request({
            method: 'GET',
            uri: `https://api.wunderground.com/api/${wuKey}/forecast/geolookup/conditions/q/${icao}.json`
        }, (err, res, body) => {
            if (!body || !body.current_observation) return cb('Unable to get weather data');
            return cb(null, {
                alt: body.current_observation.display_location.elevation,
                pressure: body.current_observation.pressure_in
            });
        });
    };
};

module.exports = WU;