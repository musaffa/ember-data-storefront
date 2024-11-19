import Service from '@ember/service';

// do not delete this service! it's being used to communicte cached payloads
// between the client and the browser
export default Service.extend({
  fastbootDataRequests: null,

  init() {
    this._super(...arguments);
    this.set('fastbootDataRequests', {});
  }
});
