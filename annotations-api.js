'use strict';

var express    = require('express'),
    bodyParser = require('body-parser'),
    HTTPStatus = require('http-status-codes'),
    api        = new express.Router();

var Nedb        = require('nedb'),
    annotations = new Nedb({ filename: './annotations.db', autoload: true });

function authorizationCheck(req, res, next) {
    var authHeader = req.headers.authorization;
    
    if (!authHeader) {
        res.sendStatus(HTTPStatus.UNAUTHORIZED);
        return;
    }

    var annotationToken = authHeader.replace(/Bearer\s+/, '').trim();
    req.annotationToken = annotationToken;
    next();
}

function sendError(res, error) {
    res.status(HTTPStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || err.toString() });
    return;
}

api.use(bodyParser.json());
api.use(authorizationCheck);

function getTimestamp() {
    var d = new Date();
    return d.toISOString()
        .replace('T', ' ')
        .replace(/\.\d*Z/, '.000000');
}

function createAnnotation(data, options) {
    options = options || {}

    var annotation = data;
    annotation._user = options.annotationToken;

    var timestamp = getTimestamp();
    annotation.created = timestamp;
    if (options.update)
        annotation.updated = timestamp;

    if (annotation.quote) {
        if (options.clipQuote) {
            annotation.quote = annotation.quote.substr(0, 256);
            annotation.qouteClipped = 'Y';
        } else {
            annotation.qouteClipped = 'N';
        }
    }

    return annotation;
}

function annotationProcessor(annotationDoc) {
    annotationDoc.id = annotationDoc._id;
    return annotationDoc;
}

api.get('/', function getAnnotations(req, res) {
    var user = req.annotationToken;

    annotations.find({ _user: user }, function (err, annotations) {
        if (err) {
            sendError(res, err);
            return;
        }

        res.status(HTTPStatus.OK).json({
            responseTime: 0, //TODO: calculate real time
            total: annotations.length,
            rows: annotations.map(annotationProcessor)
        });
    });
});

api.post('/', function addAnnotation(req, res) {
    var annotation = createAnnotation(req.body, {
        annotationToken: req.annotationToken,
        clipQuote: true,
    });

    annotations.insert(annotation, function(err, annotation){
        if (err) {
            sendError(res, err);
            return;
        }

        res.status(HTTPStatus.CREATED)
            .json(annotationProcessor(annotation));
    });
});

api.put('/:id', function updateAnnotation(req, res) {
    var annotationId = req.params.id;

    var annotation = createAnnotation(req.body, {
        annotationToken: req.annotationToken,
        clipQuote: true,
        update: true
    });

    annotations.update({ _id: annotationId }, { $set: annotation }, { upsert: true }, function(err) {
        if (err) {
            sendError(res, err);
            return;
        }

        annotations.findOne({ _id: annotationId }, function(err, annotation) {
            if (err) {
                sendError(res, err);
                return;
            }

            res.status(HTTPStatus.OK)
                .json(annotationProcessor(annotation));
        });
    });
});

api.delete('/:id', function deleteAnnotation(req, res) {
    var annotationId = req.params.id;

    annotations.remove({ _id: annotationId }, {}, function (err) {
        if (err) {
            sendError(res, err);
            return;
        }

        res.sendStatus(HTTPStatus.NO_CONTENT);
    });
});

module.exports = api;
