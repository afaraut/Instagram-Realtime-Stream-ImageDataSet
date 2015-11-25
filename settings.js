
var exports;

exports.CLIENT_ID = process.env.IG_CLIENT_ID || '***';
exports.CLIENT_SECRET = process.env.IG_CLIENT_SECRET || '***';
exports.basePath = process.env.IG_BASE_PATH || '***';
exports.appPort = process.env.IG_APP_PORT || 3000;
exports.debug = true;
exports.mainDirectory = process.env.mainDirectory || 'D:/***';
exports.directory = process.env.directory || '/***/';
exports.mongoDBURL = process.env.mongoDBURL || 'mongodb://localhost:27017/***';
exports.collection_MongoDB = process.env.collection_MongoDB || '***';