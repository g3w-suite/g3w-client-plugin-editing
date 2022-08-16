import TableVueObject from '../components/Table.vue';
const {base, inherit} = g3wsdk.core.utils;
const Component = g3wsdk.gui.vue.Component;
const TableService = require('../services/tableservice');

const InternalComponent = Vue.extend(TableVueObject);

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
  service.once('ready', ()=> this.emit('ready'));
  this.unmount = function() {
    service.cancel();
    return base(this, 'unmount');
  };
};

inherit(TableComponent, Component);


module.exports = TableComponent;


