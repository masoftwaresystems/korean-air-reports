'use strict';

var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    Account = require('../models/account'),
    Hazard = require('../models/hazard'),
    SCRS = require('../models/scrs'),
    nodemailer = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport'),
    config = require('../cfg'),
    pkg =  require('../package.json'),
    transporter;

if (config.email && config.email.enabled) {
    if (config.email.enableSMTP === 1) {
        var options = {
            host: config.email.transporter.host,
            port: config.email.transporter.port,
            auth: {
                user: config.email.transporter.auth.user,
                pass: config.email.transporter.auth.pass
            }
        };
        transporter = nodemailer.createTransport(smtpTransport(options));
    } else {
        transporter = nodemailer.createTransport();
    }
}

function getReqBody (req) {
    var bodyParams = decodeURIComponent(req.body),
        body = {
            username: '',
            password: ''
        };

    if (typeof bodyParams === 'string' && bodyParams.indexOf('&') === -1) {
        bodyParams = JSON.parse(bodyParams);
        body.username = bodyParams.username;
        body.password = bodyParams.password;
    } else {
        bodyParams = bodyParams.split('&'),
        body.username = bodyParams[0] ? (bodyParams[0].split('='))[1] : '',
        body.password = bodyParams[1] ? (bodyParams[1].split('='))[1] : '';
    }
    return body;
}

function getReqBodyData (req) {
    var data = JSON.parse(req.body),
        N = 10,
        token = Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N);

    if (!data.controlNo) {
        data.controlNo = token;
    }

    return data;
}

/**
 * Sends an email to a user so they can retreive their password
 */ 
function sendMail (data) {
    var html = (JSON.stringify(data)).replace(/{/g, '').replace(/}/g, '').replace(/,/g, '<br>');
    // console.log(data);
    transporter.sendMail({
        from: config.email.sendMail.from,
        to: config.email.sendMail.from,
        bcc: config.email.sendMail.bcc,
        replyTo: config.email.sendMail.replyTo,
        subject: config.email.sendMail.subject,
        html: html
    });
}

router.get('/_hc', function (req, res, next) {
    res.json({
        status: 200,
        email: config.email,
        name: pkg.name
    });

    next();
});

router.post('/hazard/create', function (req, res, next) {
    var data = getReqBodyData(req),
        hazard = new Hazard(data),
        obj;

    hazard.save(function (err) {
        if (err) {
            res.json({
                created: false,
                message: 'hazard create error'
            });
        } else {
            obj = hazard.toJSON();
            res.json({
                controlNo: obj.controlNo,
                created: true,
                createdAt: obj.createdAt,
                message: 'hazard created',
                submitter: obj.submitter
            });
        }
    });
});

router.post('/scrs/create', function (req, res, next) {
    var data = getReqBodyData(req),
        scrs = new SCRS(data),
        obj;

    scrs.save(function (err) {
        if (err) {
            console.log({
                created: false,
                message: 'scrs create error'
            });
            return next(err);
        } else {
            obj = scrs.toJSON();
            res.json({
                controlNo: obj.controlNo,
                created: true,
                createdAt: obj.createdAt,
                message: 'scrs created',
                submitter: obj.submitter
            });
        }
    });
});

router.post('/:report/update/:submit', function (req, res, next) {
    var report = req.params.report,
        submit = req.params.submit,
        data = getReqBodyData(req),
        hazard = new Hazard(data),
        Instance;

    switch (report) {
        case 'hazard':
            Instance = Hazard;
            data.submitted = (submit === 'submit') ? true : false;
            data.reportType = 'Hazard';
            break;
        case 'scrs':
            Instance = SCRS;
            data.submitted = (submit === 'submit') ? true : false;
            data.reportType = 'SCRS';
            break;
    }

    if (Instance) {
        Instance.findOneAndUpdate(
            {controlNo: data.controlNo},
            data,
            function (err, doc) {
                if (err) {
                    res.json({
                        error: err,
                        message: 'update error',
                        submitted: false
                    });
                } else {
                    sendMail(data);
                    res.json({
                        data: data,
                        message: 'update success',
                        submitted: data.submitted
                    });
                }
                return false;
            }
        );
    } else {
        next();
    }
});

module.exports = router;
