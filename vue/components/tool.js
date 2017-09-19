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

// dichairo il componente tool in generale da poter esserre riutilizzato
Vue.component('tool', ToolComponent);

module.exports = ToolComponent;


