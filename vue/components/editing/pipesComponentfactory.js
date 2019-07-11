module.exports = function createPipesComponent(pipes) {
  return {
    template: require('./pipes.html'),
    props: {
      data: {
        type: Array
      },
      selectitems: {
        type: Array
      },
      size: {
        type: Object
      }
    },
    data() {
      return {
        disabled: true,
        offset: 0,
        reset: false,
        branch_length: 0,
        timeout: null,
        pipes
      }
    },
    computed: {
      height() {
        return this.size.height - 10;
      },
      setdisabled() {
        return !this.selectitems.length;
      }
    },
    activated() {
      this.$forceUpdate();
    },
    watch: {
      selectitems(newSelectedItems, oldSelectedItems) {
        const newLength = newSelectedItems.length;
        const oldLength = oldSelectedItems.length;
        let items, checked;
        if (newLength > oldLength ) {
          items = newSelectedItems.filter((item) => {
            return oldSelectedItems.indexOf(item) === -1;
          });
          checked = true;
        } else {
          items = oldSelectedItems.filter((item) => {
            return newSelectedItems.indexOf(item) === -1;
          });
          checked = false;
        }
        items.forEach((item) => {
          document.querySelector(`input[index="${item.index}"]`).checked = checked;
        });
        if (newLength === 0)
          this.setOffsetToZero();
        document.querySelector('#select_all_pipes').checked = newLength === this.pipes.originalvalues.length;
      },
      offset(currentvalue, oldvalue) {
        if(!this.reset) {
          if(this.timeout) clearTimeout(this.timeout);
          this.timeout = setTimeout(() => {
            this.selectitems.forEach((item) => {
              item.value += (+currentvalue) - (+oldvalue);
              this.pipes.data[item.index][2] = item.value;
            });
            this.$emit('change-items', this.selectitems);
          }, 300)
        }
        else this.reset = false;
      }
    },
    methods: {
      setOffsetToZero() {
        this.reset = true;
        this.offset = 0;
      },
      resetValues() {
        this.selectitems.forEach((item) => {
          item.value = this.pipes.originalvalues[item.index];
          this.changeItem(item);
        });
        this.setOffsetToZero();
      },
      changeItem(item) {
        this.pipes.data[item.index][2] = item.value;
        this.$emit('change-item', {
          item,
          render: true
        });

      },
      selectUnselectAllItems(evt) {
        const checked = evt.target.checked;
        const items = document.querySelectorAll('.checkbox_pipe');
        items.forEach((item) => {
          item.checked = checked;
        });
        checked ? this.$emit('select-all') : this.$emit('unselect-all');
      },
      selectUnselectItem(evt, index) {
        evt.target.checked ? this.setSelectItem(index) : this.setUnselectItem(index)
      },
      setSelectItem(index) {
        this.$emit('select-item', index);
      },
      setUnselectItem(index) {
        this.$emit('unselect-item', index)
      }
    },
    destroyed() {
      if(this.timeout) clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
