const request = require('request').defaults({
    json: true
});
const geolib = require('geolib');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const _ = require('lodash');

const WU = function () {
    if (!(this instanceof WU)) return new WU();
    let airports;
    const icaos = {};
    this.getAirports = (cb) => {
        fs.readFile('airports.csv', 'UTF-8', (err, data) => {
            airports = data.split('\n');
            for (let i = 0; i < airports.length; i++){
                airports[i] = airports[i].split(',');
                icaos[airports[i][5].replace(/"/g, '')] = {
                    elevation: airports[i][8] / 3.28084,  //ft to m, phone is expecting m
                    city: airports[i][1].replace(/"/g, '')
                };
            }
            cb();
        });
    },

    this.findICAO = (lat, long, cb) => {
        const closestAirport = {
            distance: 999999999999999,
        };
        for (let i = 0; i < airports.length; i++){
            const airport = airports[i];
            let dist;
            try {
                dist = geolib.getDistanceSimple({
                    latitude: Number(lat),
                    longitude: Number(long)
                }, {
                    latitude: Number(airport[6]),
                    longitude: Number(airport[7])
                });
            } catch (e) {

            }
            if (dist && dist < closestAirport.distance) {
                closestAirport.distance = dist;
                closestAirport.icao = airport[5].replace(/"/g, '');
                closestAirport.elevation = Number(airport[8]);
            }
        }
        return cb(null, closestAirport.icao);
    };

    this.getAirportData = (icao, cb) => {
        icao = icao.toUpperCase();
        request({
            method: 'GET',
            uri: `https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${icao}&hoursBeforeNow=2`
        }, (err, res, body) => {
            if (err) return cb(err);
            parseString(body, (err, jsonbody) => {
                if (err) return cb('Unable to parse XML response');
                const press = _.get(jsonbody, 'response.data[0].METAR[0].altim_in_hg[0]');
                if (!press) {
                    return cb('Unable to get airport data');
                }
                return cb(null, {
                    city: icaos[icao].city,
                    alt: icaos[icao].elevation,
                    pressure: press
                });
            });
        });
    };
};

module.exports = WU;