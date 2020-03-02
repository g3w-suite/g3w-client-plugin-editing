const compiledTemplate = Vue.compile(require('./tool.html'));
const ToolComponent = Vue.extend({
  ...compiledTemplate,
  props: ['state' ,'resourcesurl'],
  data: function() {
    return {}
  },
  methods: {
    toggletool: function() {
      // se non è attivo lo attivo emettendo il segnale
      if (!this.state.active) this.$emit('setactivetool', this.state.id);
      else this.$emit('stopactivetool');
    }
  }
});

// dichairo il componente tool in generale da poter esserre riutilizzato
Vue.component('tool', ToolComponent);

module.exports = ToolComponent;


