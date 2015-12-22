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
        token = Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N),
        hazard;

    data.controlNo = token;

    return data;
}

/**
 * Sends an email to a user so they can retreive their password
 */ 
function sendMail (req) {
    var body = getReqBody(req);

    transporter.sendMail({
        from: config.email.sendMail.from,
        to: body.username,
        bcc: config.email.sendMail.bcc,
        replyTo: config.email.sendMail.replyTo,
        subject: config.email.sendMail.subject,
        html: 'Username: ' + body.username + '<br>Password: ' + body.password + '<br>Login: ' + config.email.sendMail.loginUrl
    });
}

router.get('/_hc', function (req, res, next) {
    res.json({
        status: 200,
        email: config.email,
        name: pkg.name,
        mongo: config.mongo
    });
});

router.post('/login', function (req, res, next) {
    var body = getReqBody(req);

    if (!body.password || body.password === '') {
        return res.json({authenticate: false, username: body.username, login: false});
    }
    Account.findByUsername(body.username, function (err, account) {
        if (err) {
            return res.json({authenticate: false, login: false, error: err.message, message: 'find user error'});
        }

        passport.authenticate('local', function(err, user, info) {
            /*console.log(info);
            console.log(account);
            console.log(err);
            console.log(user);*/
            if (err) {
                return res.json({authenticate: false, login: false, message: err.message});
            }
            if (!user) {
                return res.json({authenticate: false, login: false, message: info.message});
            }
            return res.json({authenticate: true, username: body.username, login: true});
        })({body: {username: body.username, password: body.password}}, res, next);
    });
});

router.post('/logout', function (req, res) {
    var body = getReqBody(req);

    req.logout();
    res.json({
        status: 200,
        authenticate: false,
        username: body.username,
        message: 'logout'
    });
});

router.post('/register', function (req, res, next) {
    var body = getReqBody(req);

    Account.register(new Account({username: body.username}), body.password, function (err, account) {
        if (err) {
            return res.json({authenticate: false, register: false, error: err.message});
        }

        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return res.json({authenticate: false, register: false, message: err.message});
            }
            if (config.email && config.email.enabled) {
                sendMail(req);
            }
            return res.json({authenticate: true, register: true, username: body.username});
        })(req, res, next);
    });
});

router.post('/reset', function (req, res) {
    var body = getReqBody(req);

    Account.findOne({username: body.username}, function (findError, account) {
        if (findError) {
            return res.status(500).json({
                status: 500,
                message: findError
            });
        }
        if (!account) {
            return res.status(404).json({
                status: 404,
                message: 'Account not found'
            });
        }
        account.setPassword(body.password, function (resetError, resetAccount) {
            if (resetError) {
                return res.status(500).json({
                    status: 500,
                    authenticate: false,
                    username: body.username,
                    message: resetError
                });
            }
            account.save(function (saveError) {
                if (saveError) {
                    return res.status(500).json({
                        status: 500,
                        authenticate: true,
                        username: body.username,
                        message: saveError
                    });
                }
                if (config.email && config.email.enabled) {
                    sendMail(req);
                }
                return res.json({
                    status: 200,
                    authenticate: true,
                    username: body.username,
                    message: 'reset'
                });
            });
        });
    });
});

router.post('/hazard/create', function (req, res, next) {
    var data = getReqBodyData(req),
        hazard = new Hazard(data),
        obj;

    hazard.save(function (err) {
        if (err) {
            console.log({
                created: false,
                message: 'hazard create error'
            });
            return next(err);
        } else {
            obj = hazard.toJSON();
            res.json({
                controlNo: obj.controlNo,
                created: true,
                createdAt: obj.createdAt,
                message: 'hazard created'
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
                message: 'scrs created'
            });
        }
    });
});

module.exports = router;
