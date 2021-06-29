const {base, inherit, merge} = g3wsdk.core.utils;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const Component = g3wsdk.gui.vue.Component;
const ApplicationState = g3wsdk.core.ApplicationState;
const EditingService = require('../services/editingservice');
const compiledTemplate = Vue.compile(require('./editing.html'));
const ToolboxComponent = require('./components/toolbox');

const vueComponentOptions = {
  ...compiledTemplate,
  data: null,
  components: {
    'toolbox': ToolboxComponent
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    undo() {
      const session = this.state.toolboxselected.getSession();
      const undoItems = session.undo();
      this.$options.service.undoRelations(undoItems)
    },
    redo() {
      const session = this.state.toolboxselected.getSession();
      const redoItems = session.redo();
      this.$options.service.redoRelations(redoItems)
    },
    commit(toolboxId) {
      const toolbox = this.$options.service.getToolBoxById(toolboxId);
      this.$options.service.commit({
        toolbox
      })
    },
    saveAll() {},
    startToolBox(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      ApplicationState.online && toolbox.canEdit() && toolbox.start();
    },
    stopToolBox(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      if (toolbox.state.editing.history.commit) this.$options.service.commit().always(() => toolbox.stop());
      else toolbox.stop();
    },
    saveToolBox(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      toolbox.save();
    },
    _setActiveToolOfToolbooxSelected(toolId, toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      this.state.toolboxidactivetool = toolboxId;
      const tool = toolbox.getToolById(toolId);
      toolbox.setActiveTool(tool);
    },
    // method to start tool of toolbox
    startActiveTool(toolId, toolboxId) {
      if (this.state.toolboxidactivetool && toolboxId !== this.state.toolboxidactivetool) {
        this._checkDirtyToolBoxes(this.state.toolboxidactivetool)
          .then(toolbox => {
            toolbox && toolbox.stopActiveTool();
            this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
          })
      } else this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
    },
    stopActiveTool(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      toolbox.stopActiveTool();
    },
    setSelectedToolbox(toolboxId) {
      const service = this.$options.service;
      const toolbox = this._getToolBoxById(toolboxId);
      const toolboxes = service.getToolBoxes();
      const toolboxSelected = toolboxes.find(toolbox => toolbox.isSelected());
      toolboxSelected && toolboxSelected.setSelected(false);
      toolbox.setSelected(true);
      this.state.toolboxselected = toolbox;
      if (toolbox.getDependencies().length) {
        this.state.message = "<div>\n" +
          t("editing.messages.change_toolbox_relation") + "\n" +
          "</div>"
      } else {
        this.state.message = null;
      }
    },
    _checkDirtyToolBoxes(toolboxId) {
      return this.$options.service.commitDirtyToolBoxes(toolboxId);
    },
    _getToolBoxById(toolboxId) {
      const service = this.$options.service;
      const toolbox = service.getToolBoxById(toolboxId);
      return toolbox;
    },
    _enableEditingButtons(bool) {
      this.editingButtonsEnabled = !bool;
    }
  },
  computed: {
    message() {
      const message = "";
      return message;
    },
    canCommit: function() {
      return this.$options.service.getSaveConfig().mode === 'default' && this.state.toolboxselected && this.state.toolboxselected.state.editing.history.commit && this.editingButtonsEnabled;
    },
    canUndo() {
      const toolbox = this.state.toolboxselected;
      const canUndo = toolbox &&  toolbox.state.editing.history.undo && this.editingButtonsEnabled;
      this.$options.service.fireEvent('canUndo', canUndo);
      return canUndo;
    },
    canRedo() {
      const toolbox = this.state.toolboxselected;
      const canRedo = toolbox && toolbox.state.editing.history.redo && this.editingButtonsEnabled;
      this.$options.service.fireEvent('canRedo', canRedo);
      return canRedo
    }
  },
  watch:{
    canCommit(bool) {
      this.$options.service.registerLeavePage(bool);
    }
  },
  created() {
    this.appState = ApplicationState;
    this.$options.service.registerOnLineOffLineEvent();
    GUI.closeContent();
    GUI.on('opencontent', this._enableEditingButtons);
    GUI.on('closeform', this._enableEditingButtons);
    GUI.on('closecontent', this._enableEditingButtons);
    GUI.getComponent('map').getService().seSelectionLayerVisible(false);
  },
  beforeDestroy() {
    GUI.off('opencontent', this._enableEditingButtons);
    GUI.off('closeform', this._enableEditingButtons);
    GUI.off('closecontent', this._enableEditingButtons);
    this.$options.service.unregisterOnLineOffLineEvent();
    GUI.getComponent('map').getService().seSelectionLayerVisible(true);
    this.$options.service.fireEvent('closeeditingpanel');
  }
};

function PanelComponent(options={}) {
  base(this, options);
  this.vueComponent = vueComponentOptions;
  this.name = options.name || 'Editing data';
  merge(this, options);
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();
  this._service = options.service || EditingService;
  const InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: () => {
      return {
        state: this._service.state,
        resourcesurl: this._resourcesUrl,
        showcommitbar: options.showcommitbar,
        editingButtonsEnabled: true
      }
    }
  });

  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    const d = $.Deferred();
    this._service.stop()
      .finally(() => {
        this.unmount = function() {
          base(this, 'unmount')
            .then(() => d.resolve());
        };
        this.unmount();
      });
    return d.promise();
  };
}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


