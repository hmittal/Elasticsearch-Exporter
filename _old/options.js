var fs = require('fs');
require('colors');

/**
 * Holds the nomnom object with all the OPTIONS and settings.
 */
exports.nomnom = null;

/**
 * Stores information about which variable has been set from the command line.
 */
exports.overrides = {};

/**
 * Sets up nomnom with all available command line OPTIONS and returns the parsed OPTIONS object.
 *
 * @returns {Object}
 */
exports.initialize = function() {
    console.log("Elasticsearch Exporter - Version " + require('./package.json').version);
    var options = {
        sourceHost: {
            abbr: 'a',
            'default': 'localhost',
            metavar: '<hostname>',
            help: 'The host from which data is to be exported from'
        },
        targetHost: {
            abbr: 'b',
            metavar: '<hostname>',
            help: 'The host to which to import the data to. Needs to be a different host than the source host, if no index is given'
        },
        sourcePort: {
            abbr: 'p',
            'default': 9200,
            metavar: '<port>',
            help: 'The port of the source host to talk to'
        },
        targetPort: {
            abbr: 'q',
            metavar: '<port>',
            help: 'The port of the target host to talk to'
        },
        sourceIndex: {
            abbr: 'i',
            metavar: '<index>',
            help: 'The index name from which to export data from. If no index is given, the entire database is exported'
        },
        targetIndex : {
            abbr : 'j',
            metavar : '<index>',
            help : 'The index name to which to import the data to. Will only be used and is required if a source index has been specified'
        },
        sourceType : {
            abbr : 't',
            metavar : '<type>',
            help : 'The type from which to export data from. If no type is given, the entire index is exported'
        },
        targetType: {
            abbr: 'u',
            metavar: '<type>',
            help: 'The type name to which to import the data to. Will only be used and is required if were importing to the same'
        },
        sourceQuery: {
            abbr: 's',
            metavar: '<query>',
            help: 'Define a query that limits what kind of documents are exporter from the source',
            'default': {
                match_all:{}
            }
        },
        sourceSize: {
            abbr: 'z',
            metavar: '<size>',
            help: 'The maximum number of results to be returned per query.',
            'default': 10
        },
        sourceFile: {
            abbr: 'f',
            metavar: '<filebase>',
            help: 'The filename from which the data should be imported. The format depends on the compression flag (default = compressed)'
        },
        targetFile: {
            abbr: 'g',
            metavar: '<filebase>',
            help: 'The filename to which the data should be exported. The format depends on the compression flag (default = compressed)'
        },
        testRun: {
            abbr: 'r',
            metavar: 'true|false',
            help: 'Make a connection with the database, but don\'t actually export anything',
            'default': false,
            choices: [ true, false ]
        },
        memoryLimit: {
            abbr: 'm',
            metavar: '<fraction>',
            help: 'Set how much of the available memory the process should use for caching data to be written to the target driver. Should be a float value between 0 and 1 (make sure to pass --nouse-idle-notification --expose-gc as node OPTIONS to make this work)',
            'default' : 0.9
        },
        targetCompression: {
            abbr: 'd',
            metavar: 'true|false',
            help: 'Set if compression should be used to write the data files',
            'default': true,
            choices: [ true, false ]
        },
        errorsAllowed: {
            abbr: 'e',
            metavar: '<count>',
            help: 'If a connection error occurs this will set how often the script will retry to connect. This is for both reading and writing data.',
            'default': 3
        },
        logEnabled: {
            abbr: 'l',
            metavar: 'true|false',
            help: 'Set logging to console to be enable or disabled. Errors will still be printed, no matter what.',
            'default': true,
            choices: [ true, false ]
        },
        sourceAuth: {
            abbr: 'A',
            metavar: '<username:password>',
            help: 'Set authentication parameters for reaching the source Elasticsearch cluster'
        },
        targetAuth: {
            abbr: 'B',
            metavar: '<username:password>',
            help: 'Set authentication parameters for reaching the target Elasticsearch cluster'
        },
        optionsFile: {
            abbr: 'o',
            metavar: '<file.json>',
            help: 'Read OPTIONS from a given file. Options from command line will override these values'
        },
        mapping: {
            abbr: 'M',
            metavar: '<mapping/setting>',
            help: 'Override the settings/mappings of the source with the given settings/mappings string (needs to be proper format for ElasticSearch)'
        },
        skipData: {
            abbr: 'N',
            metaVar: 'true|false',
            help: 'Do not copy data, just the mappings',
            'default': false,
            choices: [ true, false ]
        },
        overwrite: {
            abbr:'x',
            metavar: 'true|false',
            help: 'Allows to preserve already imported docs in the target database, so that changes are not overwritten',
            'default': true,
            choices: [ true, false ]
        },
        count: {
            abbr: 'c',
            metavar: 'true|false',
            help: 'Keep track of individual documents fetched from the source driver. Warning: might take up lots of memory',
            'default': false,
            choices: [ true, false ]
        },
        maxSockets: {
            abbr: 'S',
            metavar: '<number>',
            help: 'Sets the maximum number of concurrent sockets for the global http agent',
            'default': 30
        },
        sourceHttpProxy: {
            abbr: 'P',
            metavar: '<host>',
            help: 'Set an http proxy to use for all source requests.'
        },
        targetHttpProxy: {
            abbr: 'Q',
            metavar: '<host>',
            help: 'Set an http proxy to use for all target requests.'
        },
        sourceUseSSL: {
            abbr: 'U',
            metavar: 'true|false',
            help: 'Will attempt to connect to the source driver using https',
            'default': false,
            choices: [ true, false ]
        },
        targetUseSSL: {
            abbr: 'V',
            metavar: 'true|false',
            help: 'Will attempt to connect to the target driver using https',
            'default': false,
            choices: [ true, false ]
        },
        insecure: {
            abbr: 'T',
            metavar: 'true|false',
            help: 'Allow connections to SSL site without certs or with incorrect certs.',
            'default': false,
            choices: [ true, false ]
        }
    };
    function detectArgs(value) {
        exports.overrides[this.name] = value;
    }
    for (var key in options) {
        options[key].callback = detectArgs;
    }
    exports.nomnom = require('nomnom').script('exporter').options(options);
    return exports.nomnom.parse();
};

/**
 * If a source file has been set then this will check if the file has been compressed by checking the file header.
 * This check is circumvented if the sourceCompression flag has been set (which forces to read un-/compressed).
 *
 * @param opts
 */
exports.detectCompression = function(opts) {
    if (!opts.sourceFile) return;
    var header = new Buffer(2);
    fs.readSync(fs.openSync(opts.sourceFile + '.data', 'r'), header, 0, 2);
    opts.sourceCompression = (header[0] == 0x1f && header[1] == 0x8b);
};

/**
 * A lot of settings that are needed later can be set automatically to make the life of the user easier.
 * This function performs this task.
 * @param opts
 */
exports.autoFillOptions = function(opts) {
    if (!opts.targetHost && !opts.targetFile) {
        opts.targetHost = opts.sourceHost;
    }
    if (!opts.targetPort && !opts.targetFile) {
        opts.targetPort = opts.sourcePort;
    }
    if (opts.sourceIndex && !opts.targetIndex) {
        opts.targetIndex = opts.sourceIndex;
    }
    if (opts.sourceType && !opts.targetType) {
        opts.targetType = opts.sourceType;
    }
    if ((process.env.HTTP_PROXY || process.env.http_proxy) && !opts.httpProxy) {
        if(process.env.HTTP_PROXY) {
            opts.httpProxy = process.env.HTTP_PROXY;
        } else if(process.env.http_proxy) {
            opts.httpProxy = process.env.http_proxy ;
        }
    }
};

/**
 * This function will attempt to filter out any combinations of OPTIONS that are not valid.
 *
 * @param opts
 * @returns {String} An error message if any or null
 */
exports.validateOptions = function(opts) {
    if (opts.sourceFile) {
        if (!fs.existsSync(opts.sourceFile + '.meta')) {
            return 'Source File "' + opts.sourceFile + '.meta" doesn\'t exist.';
        }
        if (!fs.existsSync(opts.sourceFile + '.data')) {
            return 'Source File "' + opts.sourceFile + '.data" doesn\'t exist.';
        }
    }
	if (opts.sourceHost != opts.targetHost) return;
	if (opts.sourcePort != opts.targetPort) return;
	if (opts.sourceIndex != opts.targetIndex) return;
	if (opts.sourceType != opts.targetType && opts.sourceIndex) return;
    if (opts.sourceFile && opts.targetHost) return;
    if (opts.sourceHost && opts.targetFile) return;
    return 'Not enough information has been given to be able to perform an export. Please review the OPTIONS and examples again.';
};

/**
 * This function will read OPTIONS from the optionsFile if set them if they haven't been set before.
 *
 * @param opts
 * @returns {string} An error message if any or null
 */
exports.readOptionsFile = function(opts) {
    if (!opts.optionsFile){
        return;
    }
    if (!fs.existsSync(opts.optionsFile)) {
        return 'The given OPTIONS file could not be found.';
    }
    var fileOpts = JSON.parse(fs.readFileSync(opts.optionsFile));
    for (var prop in fileOpts) {
        if (!exports.overrides[prop]) {
            opts[prop] = fileOpts[prop];
        }
    }
};

/**
 * This function will run the initialization and all validity checks available before returning the resulting OPTIONS object.
 * @returns {Object}
 */
exports.opts = function() {
    function checkError(error) {
        if (error) {
            if (opts.logEnabled) {
                console.log(error.red);
                console.log(exports.nomnom.getUsage());
            }
            process.exit(1);
        }
    }
    var opts = exports.initialize();
    checkError(exports.readOptionsFile(opts));
    exports.detectCompression(opts);
    exports.autoFillOptions(opts);
    checkError(exports.validateOptions(opts));
    return opts;
};