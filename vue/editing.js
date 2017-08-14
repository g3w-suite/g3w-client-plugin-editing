var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var merge =  g3wsdk.core.utils.merge;
var GUI = g3wsdk.gui.GUI;
var Component = g3wsdk.gui.vue.Component;
var EditingService = require('../editingservice');
var EditingTemplate = require('./editing.html');


//il bus events per la gestione del pannello di editing
var events = new Vue();

var vueComponentOptions = {
  template: EditingTemplate,
  data: function() {
    return {
      state: this.$options.state
    }
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    toggleEditing: function(toolbox) {
      // passo il toolbox;
      if (toolbox.inEditing()) {
        events.$emit("toolbox:stop", toolbox);
        toolbox.stop();
      }
      else {
        events.$emit("toolbox:start", toolbox);
        toolbox.start();
        if (!toolbox.isSelected()) {
          _.forEach(this.state.toolboxes, function (tlbox) {
            if (tlbox.isSelected()) {
              _.forEach(tlbox.getTools(), function (tool) {
                if (tool.isStarted())
                  tool.stop();
              });
              tlbox.setSelected(false);
            }
          });
          toolbox.setSelected(true);
          this.state.toolboxSelected = toolbox;
        }
      }
    },
    saveEdits: function(toolbox) {
      events.$emit("toolbox:save", toolbox);
      toolbox.save();
    },
    toggletool: function(tool) {
      if (!tool.isStarted()) {
        events.$emit("tool:start", tool);
        _.forEach(this.state.toolboxSelected.getTools(), function(t) {
          if (t.isStarted()) {
            //vado a stoppare il tool
            t.stop()
          }
        });
        tool.start();
      }
      else {
        events.$emit("tool:stop", tool);
        tool.stop();
      }
    },
    onClose: function() {
      events.$emit("close");
    },
    select: function(toolbox) {
      if (!toolbox.isSelected()) {
        _.forEach(this.state.toolboxes, function(tlbox) {
          if (toolbox != tlbox && tlbox.isSelected()) {
            _.forEach(tlbox.getTools(), function (tool) {
              if (tool.isStarted())
                tool.stop();
            });
            tlbox.setSelected(false);
          }
        });
        toolbox.setSelected(true);
        this.state.toolboxSelected = toolbox;
        events.$emit("toolbox:selected", toolbox);
      }
    },
    undo: function() {
      var session = this.state.toolboxSelected.getSession();
      var dependenciesChanges = session.undo();
      this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    redo: function() {
      var session = this.state.toolboxSelected.getSession();
      var dependenciesChanges = session.redo();
      this.$options.service.applyChangesDependencies(session.getId(), dependenciesChanges);
    },
    commit: function() {
      // funzione che serve a fare il commit della sessione legata al tool
      // qui probabilmente a seconda del layer se ha dipendenze faccio ogni sessione
      // produrrà i suoi dati post serializzati che pi saranno uniti per un unico commit
      this.state.toolboxSelected.getSession().commit();
    },
    saveAll: function() {
      //TODO dovrebbe essere legata alla possibilità di salvare tutte le modifiche di tutti i layer
    }
  },
  computed: {
    canCommit: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) && toolbox.getSession().getHistory().canCommit();
    },
    canUndo: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) &&  toolbox.getSession().getHistory().canUndo();
    },
    canRedo: function() {
      var toolbox = this.state.toolboxSelected;
      return !_.isNull(toolbox) && toolbox.getSession().getHistory().canRedo();
    },
    // editingbtnlabel: function() {
    //   return this.state.editing.on ? "Termina editing" : "Avvia editing";
    // },
    // toolEnabled: function() {
    //   return (!this.state.editing.error && (this.state.editing.enabled || this.state.editing.on)) ? "" : "disabled";
    // },
    startorstop: function(control) {
      return this.service
    },
    message: function() {
      var message = "";
      var operator;
      if (this.state.toolboxSelected) {
        _.forEach(this.state.toolboxSelected.getTools(), function(tool) {
          if (tool.isStarted()) {
            operator = tool.getOperator();
            message = operator.getRunningStep() ? operator.getRunningStep().getHelp() : message;
            return false
          }
        })
      }
      // if (!this.state.editing.enabled) {
      //   message = '<span style="color: red">Aumentare il livello di zoom per abilitare l\'editing';
      // }
      // else if (this.state.editing.toolstep.message) {
      //   var n = this.state.editing.toolstep.n;
      //   var total = this.state.editing.toolstep.total;
      //   var stepmessage = this.state.editing.toolstep.message;
      //   message = '<div style="margin-top:20px">GUIDA STRUMENTO:</div>' +
      //     '<div><span>['+n+'/'+total+'] </span><span style="color: yellow">'+stepmessage+'</span></div>';
      // }
      return message;
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
  // dichiaro l'internal Component
  this.internalComponent = null;
  // contiene tuti gli editor Controls che a loro volta contengono i tasks per l'editing
  // di quello specifico layer
  this._toolboxes = options.toolboxes || [];
   // save buttons
  this._labels = {
    start: "Avvia modifica",
    stop: "Disattiva modifica",
    save: "Salve"
  };
  this._saveBtnLabel = options.saveBtnLabel || "Salva";
  // resource urls
  this._resourcesUrl = options.resourcesUrl || GUI.getResourcesUrl();
  this._service = options.service || EditingService;
  // setto il componente interno
  var InternalComponent = Vue.extend(this.vueComponent);
  this.internalComponent = new InternalComponent({
    service: this._service,
    state: {
      toolboxes: self._toolboxes,
      labels: self._labels,
      toolboxSelected: null
    }
  });

  // sovrascrivo richiamando il padre in append
  this.mount = function(parent) {
    return base(this, 'mount', parent, true)
  };

  this.unmount = function() {
    // faccio in modo che venga disattivato l'eventuale tool attivo al momento del
    // click sulla x
    this._service.stop();
    return base(this, 'unmount');
  };

  events.$on("close",function(){
    self.unmount();
  });

  events.$on("toolbox:start", function(toolbox) {
    // inizia editing layer
  });

  events.$on("toolbox:stop", function(toolbox) {
    // termina editing layer
  });

  events.$on("toolbox:save", function(toolbox) {
    // salva editing layer
  });

  events.$on("tool:start", function(tool) {
    // inizia operazione di editing
  });

  events.$on("tool:stop", function(tool) {
    // termina operazione di editing
  });
}

inherit(PanelComponent, Component);

module.exports = PanelComponent;


