const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const CommonApi = require('./common');

function AddFeature(options)  {
  base(this, options);
}

inherit(AddFeature, CommonApi);

module.exports = AddFeature;
