const RelationComponent = require('../../relation/vue/relation');
const RelationsComponentObj = {
  template: require('./relations.html'),
  components: {
    'relation': RelationComponent
  }
};

module.exports = RelationsComponentObj;
