/* ORIGINAL SOURCE:
* vue/components/selectfeatures/selectfeatures.js@v3.4
*/

const { toRawType } =  g3wsdk.core.utils;

function SelectFeaturesDom({features, events}={}){
  const Component = Vue.extend({
    data() {
      return {
        selected: null
      }
    },
    render(h) {
      const columns = Object.keys(features[0].getAlphanumericProperties());
      const header = columns.map(property => h('th', property));
      const thead = h('thead', [h('tr', header)]);
      const rows = features.map((feature, index) => {
        const values = columns.map(column => {
          let value = feature.get(column);
          value = toRawType(value) === 'Object' ? value.value : value;
          return h('td', value)
        });
        return h('tr', {
          on: {
            click: () => {
              this.selected = index;
              events.click(index);
            }
          },
          style: {
            cursor: 'pointer',
          },
          class: {
            'skin-background-color lighten': this.selected === index
          }
        }, values);
      });
      const tbody = h('tbody', rows);
      const table = h('table', {
        class: {
          'table table-responsive table-striped': true
        }
      }, [thead, tbody]);
      return h('div', {
        style: {
          width: '100%',
          'overflow': 'auto'
        },
      }, [table])
    }
  });
  return new Component().$mount().$el;
}

module.exports = SelectFeaturesDom;
