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
    showValue(key) {
      return !!this.headers.find((header) => {
        return header.name == key
      })
    },
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
      return this.$options.service._setLayout();
    },
    getValue(value) {
       if (value && typeof  value === 'object' && value.constructor === Object) {
         value = value.value;
       }
       return value;
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
      const maxHeightTable = this._setLayout();
      $('#editing_table table').DataTable({
        "pageLength": 10,
        "scrollX": true,
        "scrollY": maxHeightTable + 'px',
        "scrollCollapse": true,
        "order": [ 0, 'asc' ],
        columnDefs: [
          { orderable: false, targets: [-1, -2] }
        ]
      });
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
    const maxHeightTable = this.getService()._setLayout();
    $('#editing_table div.dataTables_scrollBody').height( maxHeightTable );
  }
};

inherit(TableComponent, Component);


module.exports = TableComponent;


