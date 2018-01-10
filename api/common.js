var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var Session = g3wsdk.core.editing.Session;

function CommonApi(options) {
  options = options || {};
  this.layer = options.layer;
  this.session = options.session || new Session();
  base(this);
}

inherit(CommonApi, G3WObject);

module.export = CommonApi;