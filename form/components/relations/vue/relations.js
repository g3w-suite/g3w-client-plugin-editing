const RelationComponent = require('../../relation/vue/relation');
const compiledTemplate = Vue.compile(require('./relations.html'));
const RelationsComponent = {
  ...compiledTemplate,
  components: {
    'relation': RelationComponent
  },

};

module.exports = RelationsComponent;
