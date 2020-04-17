import { fixture, assert, nextFrame } from '@open-wc/testing';
import * as sinon from 'sinon/pkg/sinon-esm.js';
import { AmfLoader } from './amf-loader.js';
import '../api-request-panel.js';

describe('<api-request-panel>', function () {
  async function basicFixture() {
    return (await fixture(`<api-request-panel></api-request-panel>`));
  }

  async function authPopupFixture() {
    return (await fixture(`<api-request-panel
      authpopuplocation="test/"></api-request-panel>`));
  }

  async function proxyFixture() {
    return (await fixture(`<api-request-panel proxy="https://proxy.domain.com/"></api-request-panel>`));
  }

  async function proxyEncFixture() {
    return (await fixture(`<api-request-panel
      proxy="https://proxy.domain.com/"
      proxyencodeurl></api-request-panel>`));
  }

  async function redirectUriFixture() {
    return (await fixture(`<api-request-panel
      redirecturi="https://auth.domain.com/token"></api-request-panel>`));
  }

  async function addHeadersFixture() {
    return (await fixture(`<api-request-panel
      appendheaders='[{"name": "x-test", "value": "header-value"}]'></api-request-panel>`));
  }

  async function navigationFixture() {
    return (await fixture(`<api-request-panel handlenavigationevents></api-request-panel>`));
  }

  async function customBaseUriSlotFixture() {
    return (await fixture(`<api-request-panel><anypoint-item slot="custom-base-uri"
                        value="http://customServer.com">http://customServer.com</anypoint-item></api-request-panel>`));
  }
  async function noSelectorFixture() {
    return (await fixture(`<api-request-panel noServerSelector><anypoint-item slot="custom-base-uri"
                        value="http://customServer.com">http://customServer.com</anypoint-item></api-request-panel>`));
  }

  function appendRequestData(element, request) {
    request = request || {};
    const editor = element.shadowRoot.querySelector('api-request-editor');
    editor._httpMethod = request.method || 'get';
    editor._url = request.url || 'https://domain.com';
    editor._headers = request.headers || '';
    editor._payload = request.payload;
  }

  describe('Initialization', () => {
    it('can be constructed with document.createElement', () => {
      const button = document.createElement('api-request-panel');
      assert.ok(button);
    });

    it('responseIsXhr is true by default', async () => {
      const element = await basicFixture();
      assert.isTrue(element.responseIsXhr);
    });

    it('hasResponse is undefined', async () => {
      const element = await basicFixture();
      assert.isUndefined(element.hasResponse);
    });

    it('api-request is dispatched', async () => {
      const element = await basicFixture();
      appendRequestData(element);
      const spy = sinon.spy();
      element.addEventListener('api-request', spy);
      const editor = element.shadowRoot.querySelector('api-request-editor');
      editor.execute();
      assert.isTrue(spy.called);
    });

    it('should hide server selector', async () => {
      const element = await basicFixture();
      await nextFrame()
      assert.isTrue(element.serverSelectorHidden)
    })

    it('should set hidden attribute to server selector', async () => {
      const element = await basicFixture();
      await nextFrame()
      const serverSelector = element.shadowRoot.querySelector('api-server-selector')
      assert.exists(serverSelector);
      assert.isTrue(serverSelector.hidden)
    });
  });
  [
    ['Compact model', true],
    ['Regular model', false]
  ].forEach(item => {
    describe('Server selection', () => {
      let element;
      let amf;

      describe('Custom URI selection', () => {
        beforeEach(async () => {
          element = await basicFixture();
          amf = await AmfLoader.load(item[1]);
          element.amf = amf;
          // This is equivilent to Custom URI being selected, and 'https://www.google.com' being input
          const event = {
            detail: {
              selectedValue: 'https://www.google.com',
              selectedType: 'custom',
            },
          };
          element.dispatchEvent(new CustomEvent('api-server-changed', event));
        });

        it('should load servers', () => {
          assert.lengthOf(element.servers, 1);
        });

        it('should update selectedServerValue on api-server-changed event', () => {
          assert.equal(element.selectedServerValue, 'https://www.google.com');
        });

        it('should still show selector when a custom URI is input', () => {
          assert.exists(element.shadowRoot.querySelector('api-server-selector'));
        });

        it('effectiveBaseUri should be equal to baseUri', () => {
          element.baseUri = 'https://example.org';
          assert.equal(element.effectiveBaseUri, element.baseUri);
          assert.equal(element.effectiveBaseUri, 'https://example.org');
        });

        it('effectiveBaseUri should be equal to selectedServerValue', () => {
          assert.equal(element.effectiveBaseUri, element.selectedServerValue);
          assert.equal(element.effectiveBaseUri, 'https://www.google.com');
        });

        it('should update computed server', async () => {
          const event = {
            detail: {
              selectedValue: 'http://{instance}.domain.com/',
              selectedType: 'server',
            },
          };
          element.dispatchEvent(new CustomEvent('api-server-changed', event));
          await nextFrame();
          assert.isDefined(element.server);
        });
      });
    });
  });

  describe('Redirect URI computation', () => {
    it('redirectUri has default value', async () => {
      const element = await basicFixture();
      assert.isTrue(element.redirectUri
        .indexOf('@advanced-rest-client/oauth-authorization/oauth-popup.html') !== -1);
    });

    it('redirectUri is computed for auth-popup location', async () => {
      const element = await authPopupFixture();
      assert.isTrue(element.redirectUri
        .indexOf('test/@advanced-rest-client/oauth-authorization/oauth-popup.html') !== -1);
    });

    it('redirectUri is not computed when redirectUri is set', async () => {
      const element = await redirectUriFixture();
      assert.isTrue(element.redirectUri.indexOf('https://auth.domain.com/token') !== -1);
    });
  });

  describe('Proxy settings', () => {
    it('Changes URL in the api-request event', async () => {
      const element = await proxyFixture();
      appendRequestData(element);
      const editor = element.shadowRoot.querySelector('api-request-editor');

      const spy = sinon.spy();
      element.addEventListener('api-request', spy);
      editor.execute();
      assert.equal(spy.args[0][0].detail.url, 'https://proxy.domain.com/https://domain.com');
    });

    it('Encodes original URL', async () => {
      const element = await proxyEncFixture();
      appendRequestData(element);
      const spy = sinon.spy();
      element.addEventListener('api-request', spy);
      const editor = element.shadowRoot.querySelector('api-request-editor');
      editor.execute();
      assert.equal(spy.args[0][0].detail.url, 'https://proxy.domain.com/https%3A%2F%2Fdomain.com');
    });
  });

  describe('Headers settings', () => {
    it('Adds headers to the request', async () => {
      const element = await addHeadersFixture();
      appendRequestData(element);
      const spy = sinon.spy();
      element.addEventListener('api-request', spy);
      const editor = element.shadowRoot.querySelector('api-request-editor');
      editor.execute();
      assert.equal(spy.args[0][0].detail.headers, 'x-test: header-value');
    });

    it('Replaces headers in the request', async () => {
      const element = await addHeadersFixture();
      appendRequestData(element, {
        headers: 'x-test: other-value'
      });
      const spy = sinon.spy();
      element.addEventListener('api-request', spy);
      const editor = element.shadowRoot.querySelector('api-request-editor');
      editor.execute();
      assert.equal(spy.args[0][0].detail.headers, 'x-test: header-value');
    });
  });

  describe('Response handling', () => {
    function propagate(element) {
      let headers = 'content-type: text/plain\nlocation: ';
      headers += 'https://other.domain.com\ncontent-length: 30';
      const detail = {
        request: {
          url: 'https://domain.com/',
          method: 'GET',
          headers: 'accept: text/plain'
        },
        response: {
          status: 200,
          statusText: 'OK',
          payload: 'Hello world',
          headers: 'content-type: text/plain'
        },
        loadingTime: 124.12345678,
        isError: false,
        isXhr: false,
        sentHttpMessage: 'GET / HTTP/1.1\nHost: domain.com\naccept: text/plain\n\n\n',
        redirects: [{
          status: 301,
          statusText: 'Not here',
          payload: 'Go to https://other.domain.com',
          headers: headers
        }],
        timing: {
          blocked: 12.0547856,
          dns: 0.12,
          connect: 112.21458762,
          send: 4.4748989,
          wait: 15.8436988,
          receive: 65.125412256,
          ssl: 10
        },
        redirectsTiming: [{
          blocked: 12.0547856,
          dns: 0.12,
          connect: 112.21458762,
          send: 4.4748989,
          wait: 15.8436988,
          receive: 65.125412256,
          ssl: 10
        }]
      };
      element._propagateResponse(detail);
    }
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('isErrorResponse is false', () => {
      propagate(element);
      assert.isFalse(element.isErrorResponse);
    });

    it('responseError is indefined', () => {
      propagate(element);
      assert.isUndefined(element.responseError, 'error is undefined');
    });

    it('loadingTime is set', () => {
      propagate(element);
      assert.equal(element.loadingTime, 124.12345678);
    });

    it('request is set', () => {
      propagate(element);
      assert.typeOf(element.request, 'object');
    });

    it('response is set', () => {
      propagate(element);
      assert.typeOf(element.response, 'object');
    });

    it('responseIsXhr is false', () => {
      propagate(element);
      assert.isFalse(element.responseIsXhr);
    });

    it('redirects is set', () => {
      propagate(element);
      assert.typeOf(element.redirects, 'array');
    });

    it('redirectsTiming is set', () => {
      propagate(element);
      assert.typeOf(element.redirectsTiming, 'array');
    });

    it('timing is set', () => {
      propagate(element);
      assert.typeOf(element.timing, 'object');
    });

    it('source message is set', () => {
      propagate(element);
      assert.typeOf(element.sourceMessage, 'string');
    });

    it('Changing selection clears response', () => {
      propagate(element);
      element.selected = 'test';
      assert.isUndefined(element.isErrorResponse);
      assert.isUndefined(element.responseError);
      assert.isUndefined(element.loadingTime);
      assert.isUndefined(element.request);
      assert.isUndefined(element.response);
      assert.isUndefined(element.responseIsXhr);
      assert.isUndefined(element.redirects);
      assert.isUndefined(element.redirectsTiming);
      assert.isUndefined(element.timing);
      assert.isUndefined(element.sourceMessage);
    });

    it('Calling clearResponse() clears response', () => {
      propagate(element);
      element.clearResponse();
      assert.isUndefined(element.isErrorResponse);
      assert.isUndefined(element.responseError);
      assert.isUndefined(element.loadingTime);
      assert.isUndefined(element.request);
      assert.isUndefined(element.response);
      assert.isUndefined(element.responseIsXhr);
      assert.isUndefined(element.redirects);
      assert.isUndefined(element.redirectsTiming);
      assert.isUndefined(element.timing);
      assert.isUndefined(element.sourceMessage);
    });
  });

  describe('Automated navigation', () => {
    let element;

    beforeEach(async () => {
      element = await navigationFixture();
    });

    function dispatch(selected, type) {
      type = type || 'method';
      document.body.dispatchEvent(new CustomEvent('api-navigation-selection-changed', {
        detail: {
          selected,
          type
        },
        bubbles: true
      }));
    }

    it('Sets "selected" when type is "method"', () => {
      const id = '%2Ftest-parameters%2F%7Bfeature%7D/get';
      dispatch(id);
      assert.equal(element.selected, id);
    });

    it('"selected" is undefined when type is not "method"', () => {
      const id = '%2Ftest-parameters%2F%7Bfeature%7D';
      dispatch(id, 'endpoint');
      assert.isUndefined(element.selected);
    });
  });

  describe('_apiResponseHandler()', () => {
    let element;
    const requestId = 'test-id';
    beforeEach(async () => {
      element = await basicFixture();
      element.lastRequestId = requestId;
    });

    const xhrResponse = {
      request: {
        url: 'https://domain.com/',
        method: 'GET',
        headers: 'accept: text/plain'
      },
      response: {
        status: 200,
        statusText: 'OK',
        payload: 'Hello world',
        headers: 'content-type: text/plain'
      },
      loadingTime: 124.12345678,
      isError: false,
      isXhr: true
    };

    it('Does nothing when ID is different', () => {
      const spy = sinon.spy(element, '_propagateResponse');
      element._apiResponseHandler({
        detail: {
          id: 'otherId'
        }
      });
      assert.isFalse(spy.called);
    });

    it('Calls _propagateResponse()', () => {
      const detail = Object.assign({}, { id: requestId }, xhrResponse);
      const spy = sinon.spy(element, '_propagateResponse');
      element._apiResponseHandler({
        detail
      });
      assert.isTrue(spy.called);
      assert.deepEqual(spy.args[0][0], detail);
    });
  });

  describe('Custom baseUri slot', () => {
    describe('with basicFixture', () => {
      let element;
      beforeEach(async () => {
        element = await basicFixture();
      });

      it('should render empty extra servers slot', () => {
        assert.exists(element.shadowRoot.querySelector('slot[name="custom-base-uri"]'));
        assert.lengthOf(element.shadowRoot.querySelector('slot[name="custom-base-uri"]').assignedNodes(), 0)
      });
    });

    describe('with customBaseUriSlot fixture', () => {
      let element;
      beforeEach(async () => {
        element = await customBaseUriSlotFixture();
      });

      it('should have 2 servers', () => {
        assert.equal(element.serversCount, 2);
      });

      it('should not hide server selector', async () => {
        assert.isUndefined(element.serverSelectorHidden)
      })

      it('should not set hidden attribute to server selector', async () => {
        const serverSelector = element.shadowRoot.querySelector('api-server-selector')
        assert.exists(serverSelector);
        assert.isUndefined(serverSelector.hidden)
      });
    });
  });

  describe('noServerSelector attribute', () => {
    describe('when panel has noServerSelector set to true', () => {
      let element;

      beforeEach(async () => {
        element = await noSelectorFixture();
      });

      it('should hide server selector', async () => {
        assert.isTrue(element.serverSelectorHidden)
      })

      it('should set hidden attribute to server selector', async () => {
        const serverSelector = element.shadowRoot.querySelector('api-server-selector')
        assert.exists(serverSelector);
        assert.isTrue(serverSelector.hidden)
      });
    })

    describe('when setting noServerSelector to true', () => {
      let element;
      beforeEach(async () => {
        element = await customBaseUriSlotFixture();
      });

      it('should show server selector at first', () => {
        assert.isUndefined(element.serverSelectorHidden)
      })

      it('should hide server selector when setting noServerSelector to true', async () => {
        element.noServerSelector = true
        await nextFrame()
        assert.isTrue(element.serverSelectorHidden)
        const serverSelector = element.shadowRoot.querySelector('api-server-selector')
        assert.exists(serverSelector);
        assert.isTrue(serverSelector.hidden)
      })
    })
  })
});
