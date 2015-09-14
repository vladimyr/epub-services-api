'use strict';

var express = require('express'),
    util    = require('util'),
    cors    = require('cors'),
    app     = express();

var argv = require('minimist')(process.argv.slice(2));

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || argv.p || argv.port || 4747);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');

app.use(cors());

var annotationsApi = require('./annotations-api.js');
app.use('/services/annotations', annotationsApi);

var server = app.listen(app.get('port'), app.get('ip'), function() {
    var serverAddr = server.address();

    console.log(util.format(
        'Services API server is listening at http://%s:%d', 
        serverAddr.address, serverAddr.port));
});
