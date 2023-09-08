/* ORIGINAL SOURCE:
* table/table.js@v3.4
*/

import TableVueObject from '../components/Table.vue';
const {base, inherit} = g3wsdk.core.utils;
const {Component} = g3wsdk.gui.vue;
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
  service.once('ready', () => this.emit('ready'));
  this.unmount = function() {
    service.cancel();
    return base(this, 'unmount');
  };
};

inherit(TableComponent, Component);


module.exports = TableComponent;


