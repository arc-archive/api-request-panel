export const AmfLoader = {};

AmfLoader.load = async function (compact, modelName) {
  if (!modelName) {
    // eslint-disable-next-line no-param-reassign
    modelName = 'demo-api';
  }
  const file = `/${modelName}${compact ? '-compact' : ''}.json`;
  // eslint-disable-next-line no-restricted-globals
  const url = `${location.protocol}//${location.host}/base/demo/${file}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', e => {
      try {
        const data = JSON.parse(e.target.response);
        resolve(data);
      } catch (ex) {
        /* istanbul ignore next */
        reject(ex);
      }
    });
    /* istanbul ignore next */
    xhr.addEventListener('error', () =>
      reject(new Error('Unable to load model file'))
    );
    xhr.open('GET', url);
    xhr.send();
  });
};
