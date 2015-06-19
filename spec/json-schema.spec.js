'use strict';

var glob = require('glob')
  , path = require('path')
  , assert = require('assert');

var ONLY_FILES, SKIP_FILES;
ONLY_FILES = [
// 'type', 'not', 'allOf', 'anyOf', 'oneOf', 'enum',
// 'maximum', 'minimum', 'multipleOf', 'maxLength', 'minLength', 'pattern',
// 'properties', 'patternProperties', 'additionalProperties',
// 'dependencies', 'required',
// 'maxProperties', 'minProperties', 'maxItems', 'minItems',
// 'items', 'additionalItems', 'uniqueItems',
// 'optional/format', 'optional/bignum',
// 'ref', 'refRemote', 'definitions',
// 'schemas/complex', 'schemas/basic', 'schemas/advanced',
];

SKIP_FILES = [
  'optional/zeroTerminatedFloats',
  'schemas/complex'
];

var DEBUG = false;


var Ajv = require('../lib/ajv')
  , ajv = Ajv({ beautify: true, _debug: DEBUG })
  , fullAjv = Ajv({ allErrors: true, verbose: true, format: 'full', beautify: true, _debug: DEBUG });

var remoteRefs = {
    // for JSON-Schema-Test-Suite
    'http://localhost:1234/integer.json': require('./JSON-Schema-Test-Suite/remotes/integer.json'),
    'http://localhost:1234/subSchemas.json': require('./JSON-Schema-Test-Suite/remotes/subSchemas.json'),
    'http://localhost:1234/folder/folderInteger.json': require('./JSON-Schema-Test-Suite/remotes/folder/folderInteger.json'),
    // for tests
    'http://localhost:1234/name.json': require('./remotes/name.json')
};

var remoteRefsWithIds = [ // order is important
  require('./remotes/bar.json'),
  require('./remotes/foo.json'),
  require('./remotes/buu.json'),
];

for (var id in remoteRefs) {
  ajv.addSchema(remoteRefs[id], id);
  fullAjv.addSchema(remoteRefs[id], id);
}

ajv.addSchema(remoteRefsWithIds);
fullAjv.addSchema(remoteRefsWithIds);


describe('Schema validation tests', function() {
  addTests('JSON-Schema tests draft4', './JSON-Schema-Test-Suite/tests/draft4/{**/,}*.json');
  addTests('Advanced schema tests', './tests/{**/,}*.json');
});


function addTests(description, testsPath) {
  describe(description, function() {
    var files = getTestFiles(testsPath);

    files.forEach(function (file) {
      var filter = {
        skip: SKIP_FILES && SKIP_FILES.indexOf(file.name) >= 0,
        only: ONLY_FILES && ONLY_FILES.indexOf(file.name) >= 0
      }

      skipOrOnly(filter, describe)(file.name, function() {
        var testSets = require(file.path);
        testSets.forEach(function (testSet) {
          skipOrOnly(testSet, describe)(testSet.description, function() {
            var validate, fullValidate;
            before(function() {
              validate = ajv.compile(testSet.schema);
              // console.log('validate', validate.toString());
              fullValidate = fullAjv.compile(testSet.schema);
            });

            testSet.tests.forEach(function (test) {
              skipOrOnly(test, it)(test.description, function() {
                doTest(validate);
                doTest(fullValidate);
              });

              function doTest(validate) {
                var valid = validate(test.data);
                if (valid !== test.valid) console.log('result', valid, test.valid, validate.errors);
                assert.equal(valid, test.valid);
                if (valid) assert(validate.errors === null);
                else assert(validate.errors.length > 0);
              }
            });
          });
        });
      });
    });
  });
}


function skipOrOnly(filter, func) {
  return filter.only ? func.only : filter.skip ? func.skip : func;
}


function getTestFiles(testsPath) {
  var files = glob.sync(testsPath, { cwd: __dirname });
  return files.map(function (file) {
    var match = file.match(/(\w+\/)\w+\.json/)
    var folder = match ? match[1] : '';
    if (folder == 'draft4/') folder = '';
    return { path: file, name: folder + path.basename(file, '.json') };
  });
}
