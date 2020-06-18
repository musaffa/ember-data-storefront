/* eslint-disable ember/no-new-mixins */

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';
import { resolve } from 'rsvp';
import { cacheKey, shoeboxize } from 'ember-data-storefront/-private/utils/get-key';
import { getOwner } from '@ember/application';
/**
  This mixin adds fastboot support to your data adapter. It provides no
  public API, it only needs to be mixed into your adapter.

  ```js
  // app/adpaters/application.js

  import JSONAPIAdapter from 'ember-data/adapters/json-api';
  import FastbootAdapter from 'ember-data-storefront/mixins/fastboot-adapter';

  export default JSONAPIAdapter.extend(
    FastbootAdapter, {

    // ...

  });
  ```

  @class FastbootAdapter
  @public
*/
export default Mixin.create({
  fastboot: service(),
  storefront: service(),

  init() {
    this._super(...arguments);
    if (this.fastboot.isFastBoot) {
      this.set('storefront.fastbootShoeboxCreated', new Date());
    }
  },

  ajax(url, type, options = {}) {
    let cachedPayload = this._getStorefrontBoxedQuery(type, url, options.data);
    let maybeAddToShoebox = this._makeStorefrontQueryBoxer(type, url, options.data);

    return cachedPayload ?
      resolve(JSON.parse(cachedPayload)) :
      this._super(...arguments).then(maybeAddToShoebox);
  },

  _makeStorefrontQueryBoxer(type, url, params) {
    let fastboot = this.get('fastboot');
    let isFastboot = fastboot && fastboot.get('isFastBoot');
    let cache = this.get('storefront.fastbootDataRequests');

    return function(response) {
      if (isFastboot) {
        let key = shoeboxize(cacheKey([type, url.replace(/^.*\/\/[^\/]+/, ''), params]));
        cache[key] = JSON.stringify(response);
      }

      return response;
    }
  },

  _getStorefrontBoxedQuery(type, url, params) {
    let payload;
    let fastboot = this.get('fastboot');
    let isFastboot = fastboot && fastboot.get('isFastBoot');
    let shoebox = fastboot && fastboot.get('shoebox');
    let box = shoebox && shoebox.retrieve('ember-data-storefront');

    const config = getOwner(this).resolveRegistration('config:environment');
    const maxAgeMinutes = config.storefront ? config.storefront.maxAge : undefined;

    if (!isFastboot && box && box.queries && Object.keys(box.queries).length > 0) {
      const valid = this.isDateValid(box.created, maxAgeMinutes);
      let key = shoeboxize(cacheKey([type, url.replace(/^.*\/\/[^\/]+/, ''), params]));

      if (valid) {
        payload = box.queries[key];
      }
      delete box.queries[key];
    }

    return payload;
  },

  isDateValid(createdString, maxAgeMinutes) {
    return (new Date() - new Date(createdString)) / 1000 / 60 < maxAgeMinutes;
  }
})
