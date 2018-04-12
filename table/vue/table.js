const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Component = g3wsdk.gui.vue.Component;
const TableService = require('../tableservice');

const InternalComponent = Vue.extend({
  template: require('./table.html'),
  data: function() {
    return {
      headers: this.$options.headers,
      state: null
    }
  },
  methods: {
    stop: function() {
      this.$options.service.cancel();
    },
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
      this.$options.service._setLayout();
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
    this.$nextTick(() => {
      $('#editing_table table').DataTable({
        "pageLength": 25,
        "bLengthChange": false,
        "order": [ 0, 'asc' ],
        "dom": '<"top"pfl><"clear">',
        columnDefs: [
          { orderable: false, targets: [-1, -2] }
        ]
      });
      $('.dataTables_paginate').on('click', () => {
        this._setLayout();
      });
      this._setLayout();
    });
  }
});

const TableComponent = function(options) {
  base(this);
  options = options || {};
  const service = options.service || new TableService({
    headers: options.headers,
    features: options.features,
    promise: options.promise,
    context: options.context,
    inputs: options.inputs,
    isrelation: options.isrelation,
    fatherValue: options.fatherValue,
    foreignKey: options.foreignKey,
    title: options.title
  });
  const headers = options.headers || [];
  // istanzio il componente interno
  this.setService(service);
  const internalComponent = new InternalComponent({
    service: service,
    headers: headers
  });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;

  this.unmount = function() {
    return base(this, 'unmount');
  };

  this.layout = function() {
    this.getService()._setLayout();
  }
};

inherit(TableComponent, Component);


module.exports = TableComponent;


