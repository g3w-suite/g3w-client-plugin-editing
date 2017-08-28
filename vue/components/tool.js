var GUI = g3wsdk.gui.GUI;
var ToolComponent = Vue.extend({
  template: require('./tool.html'),
  props: ['tool' ,'toolboxstate'],
  data: function() {
    return {
      state: this.tool.state,
      resourcesurl: GUI.getResourcesUrl()
    }
  },
  methods: {
    toggletool: function() {
      if (!this.tool.isActive()) {
        this.$emit('stopactivetool');
        this.tool.start();
        this.$emit('setactivetool', tool);
      } else {
        this.tool.stop();
      }
    }
  }
});


module.exports = ToolComponent;


