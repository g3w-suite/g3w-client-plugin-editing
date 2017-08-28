var GUI = g3wsdk.gui.GUI;
var ToolComponent = require('./tool');

var ToolboxComponent = Vue.extend({
  template: require('./toolbox.html'),
  props: ['toolbox', 'editingeventsbus'],
  data: function() {
    return {
      state: this.toolbox.state,
      resourcesurl: GUI.getResourcesUrl(),
      toolboxeventsbus: new Vue()
    }
  },
  components: {
    'tool': ToolComponent
  },
  methods: {
    select: function() {
      if (!this.isToolboxEnabled())
        return;
      if (!this.toolbox.isSelected()) {
        this.editingeventsbus.$emit('select:toolbox', this.toolbox);
        this.toolbox.setSelected(true);
        
      }
    },
    toggleEditing: function() {
      // se il toolbox non è ancora abilitato non faccio niente
      if (!this.isToolboxEnabled())
        return;
      // verifico se il toobox in oggetto è in editing o no
      this.toolbox.inEditing() ? this.toolbox.stop(): this.toolbox.start();
    },
    saveEdits: function() {
      this.toolbox.save();
    },
    // funzione che visualizza il toolbox appena sono disponibili le configurazioni
    // fields (passato dal metodo perchè in grado di ricevere parametri)
    isToolboxEnabled: function() {
      var enabled = !!this.toolbox.getLayer().getEditingFields().length;
      if (!enabled)
        this.toolbox.setMessage('Configurazione ' +  toolbox.getLayer().getName() + ' in corso .. ');
      else
        this.toolbox.clearMessage();
      return enabled;
    }
  },
  mounted: function() {
    var self = this;
    this.toolboxeventsbus.$on('stop:activetool', function() {
      self.toolbox.stopActiveTool();
    });
    this.toolboxeventsbus.$on('set:activetool', function(tool) {
      self.toolbox.setActiveTool(tool);
    })
  }
});


module.exports = ToolboxComponent;


