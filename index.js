const inherit = g3wsdk.core.utils.inherit;
const base = g3wsdk.core.utils.base;
const Plugin = g3wsdk.core.plugin.Plugin;
const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const Service = require('./services/editingservice');
const EditingPanel = require('./panel');
import pluginConfig from './config';
const addI18nPlugin = g3wsdk.core.i18n.addI18nPlugin;
const ProjectRegistry = g3wsdk.core.project.ProjectsRegistry;

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
    this.getDependencyPlugin('progeo')
      .then((api) => {
        this.service.setProgeoApi(api);
        const currentProject = ProjectRegistry.getCurrentProject();
        this.config = this.getConfig();
        this.config.urls = currentProject.state.urls;
        // check if exist any layer to edit
        if (this.service.loadPlugin()) {
          //inizialize service
          this.setHookLoading({
            loading: true
          });
          this.service.init(this.config);
        }
      })
      .catch((err)=> {
        console.log(err);
      });
    this.service.on('ready', () => {
      if (this.registerPlugin(this.config.gid)) {
        if (!GUI.ready) {
          GUI.on('ready', () => {
            this.setupGui()
          });
        } else {
          this.setupGui();
        }
      }
      this.setHookLoading({
        loading: false
      });
      this.setReady(true);
    })
  };
  //setup plugin interface
  this.setupGui = function() {
    if (this.config.visible === false)
      return false;
    this.addTools({
      name: 'progeo_editing',
      html: {
        icon: GUI.getFontClass('pencil'),
        text: t("editing.editing_data")
      },
      action: this.showEditingPanel
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

