/* Where is the backend?
 * - When the page is served by Spring Boot (http://localhost:8080) the API is on the same origin.
 * - When the page is opened another way (file://, Live Server on :5500, python http.server ...)
 *   it calls http://localhost:8080. Change BACKEND_URL below if your backend runs elsewhere. */
window.SICMS_CONFIG = (function () {
  var BACKEND_URL = 'http://localhost:8080';
  var sameOrigin = location.protocol.indexOf('http') === 0 && location.port === '8080';
  return {
    API_BASE: (sameOrigin ? '' : BACKEND_URL) + '/api',
    CURRENCY: 'INR',
    LOCALE: 'en-IN'
  };
})();
