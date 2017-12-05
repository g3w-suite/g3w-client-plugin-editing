var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var CommonApi = require('./common');

function AddFeature(options)  {
  base(this, options);
}

inherit(AddFeature, CommonApi);

module.exports = AddFeature;
