const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const Component = g3wsdk.gui.vue.Component;
const Media_Field = g3wsdk.gui.vue.Fields.media_field;
const TableService = require('../tableservice');
const compiledTemplate = Vue.compile(require('./table.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  components: {
    'g3w-media': Media_Field
  },
  data: function() {
    this.dataTable = null;
    return {
      state: null,
    }
  },
  methods: {
    showValue(key) {
      return !!this.state.headers.find((header) => {
        return header.name === key
      })
    },
    isMediaField(name) {
      return this.$options.service.isMediaField(name)
    },
    stop: function() {
      this.$options.service.cancel();
    },
    save: function() {
      this.state.isrelation ? this.$options.service.linkFeatures(this._linkFeatures) :this.$options.service.save();
    },
    cancel: function() {
      this.$options.service.cancel();
    },
    deleteFeature: function(index) {
      const id = this.state.features[index].id;
      const element = $(`#editing_table table tr#${id}`);
      this.$options.service.deleteFeature(index).then(()=>{
        this.dataTable.row(element).remove().draw()
      }).catch(()=>{})
    },
    copyFeature(index){
      this.$options.service.copyFeature(index);
    },
    editFeature: function(index) {
      this.$options.service.editFeature(index);
    },
    linkFeature: function(index, evt) {
     if (evt.target.checked)
       this._linkFeatures.push(index);
      else this._linkFeatures = this._linkFeatures.filter(addindex => addindex !== index);
    },
    _setLayout: function() {
      return this.$options.service._setLayout();
    },
    getValue(value) {
       if (value && typeof  value === 'object' && value.constructor === Object)
         value = value.value;
       else if (typeof value == 'string' && value.indexOf('_new_') === 0)
         value = null;
       return value;
    },
    setDataTable(){
      const targets = this.state.isrelation ? [0, -1, -2]: [-1, -2];
      const maxHeightTable = this._setLayout();
      this.dataTable = $('#editing_table table').DataTable({
        "pageLength": 10,
        "scrollX": true,
        "scrollY": maxHeightTable + 'px',
        "scrollCollapse": true,
        "order": [ this.state.isrelation ? 1 : 0, 'asc' ],
        columnDefs: [
          { orderable: false, targets }
        ]
      });
    }
  },
  watch: {
    'state.features'(features){
    }
  },
  mounted: function() {
    if (this.state.isrelation) this._linkFeatures = [];
    this.$nextTick(() => {
      this.setDataTable()
    });
  },
  beforeDestroy() {
    if(this._linkFeatures)
      this._linkFeatures = null;
    this.dataTable.destroy();
  }
});

const TableComponent = function(options={}) {
  base(this);

  const service = options.service || new TableService({
   ...options
  });
  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;

  this.unmount = function() {
    service.cancel();
    return base(this, 'unmount');
  };

  this.layout = function() {
    const maxHeightTable = this.getService()._setLayout();
    $('#editing_table div.dataTables_scrollBody').height( maxHeightTable );
  }
};

inherit(TableComponent, Component);


module.exports = TableComponent;


