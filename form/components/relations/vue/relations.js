var RelationComponent = require('../../relation/vue/relation');
var RelationService = require('../relationsservice');
var RelationsComponent = Vue.extend({
  template: require('./relations.html'),
  components: {
    'relation': RelationComponent
  },
  data: function() {
    return {
      state: {
        relations: RelationService.state.relations, // array contenete tutte le relazioni previste per quel layer
        validate: {
          valid: true // oggetto validate (generale) che server per poter validate
        }
      }
    }
  },
  methods: {
    isValidRelationsNumber: function(idx) {
      this.state.validate.valid = this.state.relations[idx].length >= this.state.relations[idx].TYPE;
    }
  },
  mounted: function() {
    //vado a verificare il numero di relationi
    //this.isValidRelationsNumber();
    // emetto il segnale che il form riconoscerà come agiunta a validazione
    this.$emit('addtovalidate', this.state.validate)
  }
});

module.exports = RelationsComponent;