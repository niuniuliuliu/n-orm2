let DBDataType = require('./lib/DBDataType');
let BaseEntity = require('./lib/BaseEntity');
let DBParam = require('./lib/DBParam');
let Norm = require('./lib/Norm');

exports.DBDataType = DBDataType;
exports.BaseEntity = BaseEntity;
exports.DBParam = DBParam;

exports.connect = (dbConfig) => {
    return new Norm(dbConfig);
};

exports.express = (dbConfig) => {
    return (req, res, next) => {
        req.orm = new Norm(dbConfig);
        next();
    }
};

