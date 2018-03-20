const inherit = g3wsdk.core.utils.inherit;
const base = g3wsdk.core.utils.base;
const Plugin = g3wsdk.core.plugin.Plugin;
const GUI = g3wsdk.gui.GUI;
const i18nService = g3wsdk.core.i18n;
const Service = require('./services/editingservice');
const EditingPanel = require('./panel');

const _Plugin = function() {
  base(this);
  this.name = 'editing';
  this.init = function() {
    this.setService(Service);
    this.config = this.getConfig();
    // check if exist any layer to edit
    if (this.service.loadPlugin()) {
      //inizialize service
     this.service.init(this.config);
      //plugin registry
      if (this.registerPlugin(this.config.gid)) {
        if (!GUI.ready) {
          GUI.on('ready',_.bind(this.setupGui, this));
        } else {
          this.setupGui();
        }
      }
    }
  };
  //setup plugin interface
  this.setupGui = function() {
    if (_.isBoolean(this.config.visible) && !this.config.visible)
      return false;
    let self = this;
    let toolsComponent = GUI.getComponent('tools');
    let toolsService = toolsComponent.getService();
    toolsService.addTools(0, 'EDITING', [
      {
        name: i18nService.t("editing_data"),
        action: _.bind(self.showEditingPanel, this)
      }
    ])
  };

  //method to show editing panel
  this.showEditingPanel = function() {
    const panel = new EditingPanel();
    GUI.showPanel(panel);
  };

  this.load = function() {
    this.init();
  };

  this.unload = function() {
    this.service.clear()
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

