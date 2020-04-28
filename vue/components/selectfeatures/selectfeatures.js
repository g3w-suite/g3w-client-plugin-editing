function SelectFeaturesDom({features, events}={}){

  const Component = Vue.extend({
    functional: true,
    render(h) {
      const columns = Object.keys(features[0].getAlphanumericProperties());
      const header = columns.map(property => h('th', property))
      const thead = h('thead', [h('tr', header)])
      const rows = features.map((feature, index) => {
        let selected;
        const values = columns.map( column => h('td', feature.get(column)))
        return h('tr', {
          on: {
            click: () => {
              selected = index;
              //events.click(index);
            },
            mouseover: events.mouseover.bind(null, index)
          },
          style: {
            cursor: 'pointer',
          },
          class: {
            'skin-backgrond-color': selected === index
          }
        }, values);
      })
      const tbody = h('tbody', rows);
      return h('table', {
        class: {
          table: true,
          'table-striped': true
        }
      }, [thead, tbody])
    }
  })
  return new Component().$mount().$el;
}

module.exports = SelectFeaturesDom
