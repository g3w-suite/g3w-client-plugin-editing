const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const merge =  g3wsdk.core.utils.merge;
const t = g3wsdk.core.i18n.tPlugin;
const GUI = g3wsdk.gui.GUI;
const Component = g3wsdk.gui.vue.Component;
const EditingService = require('../services/editingservice');
const EditingTemplate = require('./editing.html');
const ToolboxComponent = require('./components/toolbox');

const vueComponentOptions = {
  template: EditingTemplate,
  data: null,
  components: {
    'toolbox': ToolboxComponent //componente toolbox
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    startEditing() {
      const toolBoxes= this.$options.service.getToolBoxes().map((toolbox) => {
        return toolbox
      });
      !this.editing ? this.startToolBox(toolBoxes) : this.stopToolBox(toolBoxes);
      this.editing = !this.editing;
    },
    undo: function() {
      const session = this.state.toolboxselected.getSession();
      const undoItems = session.undo();
      this.$options.service.undoRelations(undoItems)
    },
    redo: function() {
      const session = this.state.toolboxselected.getSession();
      const redoItems = session.redo();
      this.$options.service.redoRelations(redoItems)
    },
    commit: function() {
      this.$options.service.commit();
    },
    saveAll: function() {},
    startToolBox: function(toolBoxes) {
      toolBoxes.forEach((toolbox) => {
        toolbox.start();
      })
    },
    stopToolBox: function(toolBoxes) {
      toolBoxes.forEach(async (toolbox) => {
        try {
          toolbox.state.editing.history.commit && await this.$options.service.commit(toolbox);
        } catch(error) {
          console.log(error)
        } finally {
          toolbox.stop();
        }
      })
    },
    saveToolBox: function(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      toolbox.save();
    },
    _setActiveToolOfToolbooxSelected: function(toolId, toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      this.state.toolboxidactivetool = toolboxId;
      const tool = toolbox.getToolById(toolId);
      toolbox.setActiveTool(tool);
    },
    startActiveTool: function(toolId, toolboxId) {
      // vado a verificare se l'id dell toolbox attivo è diverso o meno da quello premuto
      if (this.state.toolboxidactivetool && toolboxId != this.state.toolboxidactivetool) {
        this._checkDirtyToolBoxes(this.state.toolboxidactivetool)
          .then((toolbox) => {
            // vado a stoppare l'eventuale tool attivo del precedente toolbox
            if (toolbox)
              toolbox.stopActiveTool();
            this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
          })
      } else {
        this._setActiveToolOfToolbooxSelected(toolId, toolboxId);
      }
    },
    stopActiveTool: function(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      toolbox.stopActiveTool();
    },
    setSelectedToolbox: function(toolboxId) {
      const service = this.$options.service;
      const toolbox = this._getToolBoxById(toolboxId);
      const toolboxes = service.getToolBoxes();
      _.forEach(toolboxes, function(toolbox) {
        if (toolbox.isSelected()) {
          toolbox.setSelected(false);
          return false;
        }
      });
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
    _checkDirtyToolBoxes: function(toolboxId) {
      return this.$options.service.commitDirtyToolBoxes(toolboxId);
    },
    // funzione che mi va a aprendere dal service il toolbox in base al suo id
    _getToolBoxById: function(toolboxId) {
      const service = this.$options.service;
      const toolbox = service.getToolBoxById(toolboxId);
      return toolbox;
    }
  },
  computed: {
    message: function() {
      const message = "";
      return message;
    },
    canCommit: function() {
      return this.state.toolboxes.reduce((canCommit,toolbox) => {
        return toolbox.editing.history.commit || canCommit
      }, false)
    },
    canUndo: function() {
      const toolbox = this.state.toolboxselected;
      return !_.isNull(toolbox) &&  toolbox.state.editing.history.undo;
    },
    canRedo: function() {
      const toolbox = this.state.toolboxselected;
      return !_.isNull(toolbox) && toolbox.state.editing.history.redo;
    }
  },
  created() {
  },
  mounted() {
    this.$nextTick(() => {})
  }
};

function PanelComponent(options) {
  // proprietà necessarie. In futuro le mettermo in una classe Panel
  // da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  base(this, options);
  // qui vado a tenere traccia delle due cose che mi permettono di customizzare
  // vue component e service
  this.vueComponent = vueComponentOptions;
  this.name = options.name || 'Gestione dati';
  merge(this, options);
  // resource urls
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();
  this._service = options.service || EditingService;
  // setto il componente interno
  const InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: () => {
      return {
        //lo state è quello del servizio in quanto è lui che va a modificare operare sui dati
        state: this._service.state,
        resourcesurl: this._resourcesUrl,
        editing: false
      }
    }
  });

  // sovrascrivo richiamando il padre in append
  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    const d = $.Deferred();
    //vado a fare lo stop del servizio che fa un po di pulizia
    this._service.stop()
      .then(() => {
        //vado a riscrivere la proprietà
        this.unmount = function() {
          base(this, 'unmount')
            .then(() => {
              d.resolve()
            });
        };
        this.unmount();
      });
    return d.promise();
  };

}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


