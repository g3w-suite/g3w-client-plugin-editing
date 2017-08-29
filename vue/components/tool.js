var ToolComponent = Vue.extend({
  template: require('./tool.html'),
  props: ['state' ,'resourcesurl'],
  data: function() {
    return {}
  },
  methods: {
    toggletool: function() {
      if (!this.state.active) {
        this.$emit('setactivetool', this.state.id);
      } else {
        this.$emit('stopactivetool');
      }
    }
  }
});


module.exports = ToolComponent;


