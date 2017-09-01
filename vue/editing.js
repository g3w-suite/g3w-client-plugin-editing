var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var merge =  g3wsdk.core.utils.merge;
var GUI = g3wsdk.gui.GUI;
var Component = g3wsdk.gui.vue.Component;
var EditingService = require('../editingservice');
var EditingTemplate = require('./editing.html');
var ToolboxComponent = require('./components/toolbox');


var vueComponentOptions = {
  template: EditingTemplate,
  data: null,
  components: {
    'toolbox': ToolboxComponent //componente toolbox
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    undo: function() {
      var session = this.state.toolboxselected.getSession();
      var relationsChanges = session.undo(); // questi solo le feature (cambiamenti) che devo applicare al features stores dei singoli layers coinvolti
      //this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    redo: function() {
      var session = this.state.toolboxselected.getSession();
      var relationsChanges = session.redo();
      //this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    commit: function() {
      this.$options.service.commit();
    },
    saveAll: function() {
      //TODO dovrebbe igessere legata alla possibilità di salvare tutte le modifiche di tutti i layer
    },
    startToolBox: function(toolboxId) {
      var toolbox = this._getToolBoxById(toolboxId);
      if (toolbox)
        toolbox.start();
    },
    stopToolBox: function(toolboxId) {
      var toolbox = this._getToolBoxById(toolboxId);
      if (toolbox) {
        if (toolbox.state.editing.history.commit)
          this.$options.service.commit()
            .then(function() {
              toolbox.stop();
            });
        else
          toolbox.stop()
      }
    },
    saveToolBox: function() {
      var toolbox = this._getToolBoxById(toolboxId);
      if (toolbox)
        toolbox.save();
    },
    setActiveTool: function(toolId, toolboxId) {
      var tool;
      var toolbox = this._getToolBoxById(toolboxId);
      if (toolbox) {
        tool = toolbox.getToolById(toolId);
        toolbox.setActiveTool(tool);
      }
    },
    stopActiveTool: function(toolboxId) {
      var toolbox = this._getToolBoxById(toolboxId);
      if (toolbox) {
        toolbox.stopActiveTool()
      }
    },
    setSelectedToolbox: function(toolboxId) {
      var service = this.$options.service;
      var toolbox = this._getToolBoxById(toolboxId);
      var toolboxes = service.getToolBoxes();
      _.forEach(toolboxes, function(toolbox) {
        if (toolbox.isSelected()) {
          toolbox.setSelected(false);
          return false;
        }
      });
      toolbox.setSelected(true);
      this.state.toolboxselected = toolbox;
    },
    // funzione che mi va a aprendere dal service il toolbox in base al suo id
    _getToolBoxById: function(toolboxId) {
      var service = this.$options.service;
      var toolbox = service.getToolBoxById(toolboxId);
      return toolbox;
    },
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


