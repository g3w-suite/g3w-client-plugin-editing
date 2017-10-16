var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;
var TableService = require('../tableservice');

var InternalComponent = Vue.extend({
  template: require('./table.html'),
  data: function() {
    return {
      headers: this.$options.headers,
      state: null
    }
  },
  methods: {
    save: function() {
      this.$options.service.save();
    },
    cancel: function() {
      this.$options.service.cancel();
    },
    deleteFeature: function(index) {
      this.$options.service.deleteFeature(index);
    },
    editFeature: function(index) {
      this.$options.service.editFeature(index);
    },
    linkFeature: function(index) {
     this.$options.service.linkFeature(index);
    },
    _setLayout: function() {
      var editing_table_content_height = $('#editing_table').height();
      var height_85 = (editing_table_content_height * 85) / 100;
      var table_editing_height = $('#editing_table table').height();
      if (table_editing_height > editing_table_content_height) {
        $("#editing_table .nano").height(height_85);
      }
      $("#editing_table .nano").nanoScroller();
    }
  },
  watch: {
    'state.relations' : function() {
      this.$nextTick(function() {
        $(".nano").nanoScroller();
      });
    }
  },
  mounted: function() {
    var self = this;
    this.$nextTick(function() {
      $('#editing_table table').DataTable({
        "pageLength": 25,
        "bLengthChange": false,
        "order": [ 0, 'asc' ],
        "dom": '<"top"pfl><"clear">',
        columnDefs: [
          { orderable: false, targets: [-1, -2] }
        ]
      });
      $('.dataTables_paginate').on('click', function() {
        self._setLayout();
      });
      self._setLayout();
    });
  }
});

var TableComponent = function(options) {
  base(this);
  var options = options || {};
  var service = options.service || new TableService({
    features: options.features,
    promise: options.promise,
    context: options.context,
    inputs: options.inputs,
    isrelation: options.isrelation,
    fatherValue: options.fatherValue,
    foreignKey: options.foreignKey,
    title: options.title
  });
  var headers = options.headers || [];
  // istanzio il componente interno
  this.setService(service);
  var internalComponent = new InternalComponent({
    service: service,
    headers: headers
  });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;
  this.unmount = function() {
    return base(this, 'unmount');
  }
};

inherit(TableComponent, Component);


module.exports = TableComponent;


