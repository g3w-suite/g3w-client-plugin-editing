const inherit = g3wsdk.core.utils.inherit;
const base = g3wsdk.core.utils.base;
const Plugin = g3wsdk.core.plugin.Plugin;
const Service = require('../../services/editingservice');

const _Plugin = function() {
  base(this);
  this.name = 'editing';
  this.init = function(config={}) {
    this.setService(Service);
    this.config = config;
    this.service.init(this.config);
    return new Promise((resolve) =>{
      this.service.once('ready', ()=> resolve());
    })
  };

  this.unload = function() {
    this.service.clear()
  }
};

inherit(_Plugin, Plugin);

module.exports = new _Plugin();

