var RelationComponentObj = require('./vue/relations');
var RelationsService = function(options) {
  var self = this;
  options = options || {};
  this._context = options.options.context || {};
  this._inputs = options.options.inputs || {};
  console.log(this._inputs);
  this.state = {
    relations: [],
    validate: {
      valid: true
    }
  };
  var relations = options.relations || [];
  var EditingService = require('../../../editingservice');
  // vado a filtrare le relazioni per quelle che son o effettivamente in editing
  relations = EditingService.filterRelationsInEditing(relations);
  _.forEach(relations, function(relation) {
    self._context.fatherField = relation.fatherField;
    self._context.childField = relation.childField;
    relation.context = self._context;
    relation.inputs = {
      features: self._inputs.features,
      layer: EditingService.getEditingLayer(relation.child)
    };
    // passo lo state della relazione
    self.addRelation(relation);
  });
};

var proto = RelationsService.prototype;

proto.addRelation = function(relation) {
  // vado ad aggiungere la proprietà relations che servirà alle singole relazioni
  // per aggiungere (linkare) rewlazioni
  this.state.relations.push(relation);
};

proto.validateRelations = function() {
  var isValid = true;
  _.forEach(this.state.relations, function(relation) {

  });
  return isValid;
};

// funzione che mi serve per costruire il componente vue da innestare dentro il form
// come componente relations
proto.buildRelationsComponents = function() {
  var self = this;
  return Vue.extend({
    mixins: [RelationComponentObj],
    data: function() {
      return {
        state: self.state
      }
    }
  })
};

module.exports =  RelationsService;