var GUI = g3wsdk.gui.GUI;
var ToolComponent = Vue.extend({
  template: require('./tool.html'),
  props: ['tool' ,'toolboxstate', 'toolboxeventsbus'],
  data: function() {
    return {
      state: this.tool.state,
      resourcesurl: GUI.getResourcesUrl()
    }
  },
  methods: {
    toggletool: function() {
      if (!this.tool.isActive()) {
        this.toolboxeventsbus.$emit('set:activetool', this.tool);
      } else {
        this.$emit('stop:activetool');
      }
    }
  }
});


module.exports = ToolComponent;


