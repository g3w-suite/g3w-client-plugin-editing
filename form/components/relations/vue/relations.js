var RelationComponent = require('../../relation/vue/relation');
var RelationsComponent = Vue.extend({
  template: require('./relations.html'),
  components: {
    relation: RelationComponent
  },
  data: function() {
    return {
      state: {
        min: 1, // indica il numero mninimo di relazioni previste
        relations: [],
        validate: {
          valid: false
        }
      }
    }
  },
  methods: {
    unlinkRelation: function(index) {
      this.state.relations.splice(index,1)
    },
    linkRelation: function(relation) {
      var relation = {
        name: Date.now()
      };
      this.state.relations.push(relation);
    },
    isValidRelationsNumber: function() {
       this.state.validate.valid = this.state.relations.length >= this.state.min;
    }
  },
  watch: {
    // vado a verificare lo state
    'state.relations': function() {
      this.isValidRelationsNumber();
      // emetto il segnale che mi fa verificare se il form è valido e quindi attivo il bottone salva
      this.$emit('validateform');
      Vue.nextTick(function() {
        $(".nano").nanoScroller();
      })
    }
  },
  mounted: function() {
    //vado a verificare il numero di relationi
    this.isValidRelationsNumber();
    // emetto il segnale che il form riconoscerà come agiunta a validazione
    this.$emit('addtovalidate', this.state.validate)
  }
});

module.exports = RelationsComponent;