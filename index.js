const inherit = g3wsdk.core.utils.inherit;
const base = g3wsdk.core.utils.base;
const Plugin = g3wsdk.core.plugin.Plugin;
const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Service = require('./services/editingservice');
const EditingPanel = require('./panel');
import pluginConfig from './config';
const addI18nPlugin = g3wsdk.core.i18n.addI18nPlugin;

const _Plugin = function() {
  base(this);
  const pluginGroupTool = {
    position: 0,
    title: 'EDITING'
  };

  this.name = 'editing';
  this.init = function() {
    // add i18n of the plugin
    addI18nPlugin({
      name: this.name,
      config: pluginConfig.i18n
    });
    this.setService(Service);
    this.config = this.getConfig();
    // check if exist any layer to edit
    if (this.service.loadPlugin()) {
      this.setHookLoading({
        loading: true
      });
      this.service.once('ready', () => {
        //plugin registry
        if (this.registerPlugin(this.config.gid)) {
          if (!GUI.ready) {
            GUI.on('ready', this.setupGui.bind(this));
          } else {
            this.setupGui();
          }
        }
        this.setHookLoading({
          loading: false
        });
        const api = this.service.getApi();
        this.setApi(api);
        this.setReady(true);
      });
      //inizialize service
      this.service.init(this.config);
      this.addToolGroup(pluginGroupTool);
    }
  };
  //setup plugin interface
  this.setupGui = function() {
    if (_.isBoolean(this.config.visible) && !this.config.visible)
      return false;
    this.config.name = this.config.name ||  t("editing.editing_data");
    this.addTools({
      action: this.showEditingPanel,
      icon: 'pencil'
    }, pluginGroupTool)
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
    this.removeTools();
    this.service.clear()
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);

