const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const merge =  g3wsdk.core.utils.merge;
const t = g3wsdk.core.i18n.t;
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
    undo: function() {
      const session = this.state.toolboxselected.getSession();
      const undoItems = session.undo(); // questi solo le feature (cambiamenti) che devo applicare al features stores dei singoli layers coinvolti
      this.$options.service.undoRelations(undoItems)
    },
    redo: function() {
      const session = this.state.toolboxselected.getSession();
      const redoItems = session.redo();
      this.$options.service.redoRelations(redoItems)
    },
    commit: function(toolboxId) {
      const toolbox = this.$options.service.getToolBoxById(toolboxId);
      this.$options.service.commit(toolbox)
    },
    saveAll: function() {
      //TODO dovrebbe igessere legata alla possibilità di salvare tutte le modifiche di tutti i layer
    },
    startToolBox: function(toolboxId) {
      var toolbox = this._getToolBoxById(toolboxId);
      toolbox.start();
    },
    stopToolBox: function(toolboxId) {
      const toolbox = this._getToolBoxById(toolboxId);
      if (toolbox.state.editing.history.commit)
        this.$options.service.commit()
        // in ogni caso chiamo lo stop del toolbox
          .always(function() {
            toolbox.stop()
          });
      else
        toolbox.stop();
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
      var service = this.$options.service;
      var toolbox = service.getToolBoxById(toolboxId);
      return toolbox;
    }
  },
  computed: {
    // messaggio generale dell'editing esempio comunicando che il layer
    // che stiamo editindo è padre e quindi i figli sono disabilitati
    message: function() {
      var message = "";
      return message;
    },
    canCommit: function() {
      return this.state.toolboxselected && this.state.toolboxselected.state.editing.history.commit;
    },
    canUndo: function() {
      var toolbox = this.state.toolboxselected;
      return !_.isNull(toolbox) &&  toolbox.state.editing.history.undo;
    },
    canRedo: function() {
      var toolbox = this.state.toolboxselected;
      return !_.isNull(toolbox) && toolbox.state.editing.history.redo;
    }
  }
};

function PanelComponent(options) {
  var self = this;
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
  var InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    data: function() {
      return {
        //lo state è quello del servizio in quanto è lui che va a modificare operare sui dati
        state: self._service.state,
        resourcesurl: self._resourcesUrl
      }
    }
  });

  // sovrascrivo richiamando il padre in append
  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    var self = this;
    var d = $.Deferred();
    //vado a fare lo stop del servizio che fa un po di pulizia
    this._service.stop()
      .then(function() {
        //vado a riscrivere la proprietà
        self.unmount = function() {
          base(self, 'unmount')
            .then(function() {
              d.resolve()
            });
        };
        self.unmount();
      });
    return d.promise();
  };

}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


