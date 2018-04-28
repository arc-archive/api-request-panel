const amf = require('amf-client-js');
const fs = require('fs');

amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();

const files = new Map();
files.set('demo-api/demo-api.raml', 'RAML 1.0');
files.set('array-body/array-body.raml', 'RAML 1.0');
files.set('appian-api/appian-api.raml', 'RAML 1.0');
files.set('nexmo-sms-api/nexmo-sms-api.raml', 'RAML 1.0');
files.set(`loan-ms/loan-microservice.json`, 'OAS 2.0');
/**
 * Generates json/ld file from parsed document.
 *
 * @param {Object} doc
 * @param {String} file
 * @param {String} type type of source document
 * @return {Promise}
 */
function processFile(doc, file, type) {
  const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
  console.log('Resolving', file);
  const r = amf.Core.resolver(type);
  doc = r.resolve(doc, 'editing');
  let dest = file.substr(0, file.lastIndexOf('.')) + '.json';
  if (dest.indexOf('/') !== -1) {
    dest = dest.substr(dest.lastIndexOf('/'));
  }
  console.log('Generating data', file);
  let genTime = Date.now();
  return generator.generateString(doc)
  .then((data) => {
    console.log('Generation took %d ms for %s', (Date.now() - genTime), file);
    fs.writeFileSync('demo/' + dest, data, 'utf8');
  });
}
/**
 * Parses file and sends it to process.
 *
 * @param {String} file File name in `demo` folder
 * @param {String} type Source file type
 * @return {String}
 */
function parseFile(file, type) {
  console.log('Parsing', file);
  const parser = amf.Core.parser(type, 'application/yaml');
  return parser.parseFileAsync(`file://demo/${file}`)
  .then((doc) => processFile(doc, file, type));
}

amf.Core.init().then(() => {
  const promises = [];
  for (const [file, type] of files) {
    promises.push(parseFile(file, type));
  }

  Promise.all(promises)
  .then(() => console.log('Success'))
  .catch((e) => console.error(e));
});
