<template>
    <div class="pipes_wapper">
      <table style="width:100%;">
        <thead>
          <tr style="border-bottom: 2px solid;  display:flex; justify-content:space-between; align-items: baseline;" class="skin-border-color">
            <th style="padding: 5px;">
              <input id="select_all_pipes" type="checkbox" class="magic-checkbox" @change="selectUnselectAllItems">
              <label for="select_all_pipes">TUTTI</label>
            </th>
            <th style="display: flex; justify-content:flex-end; padding: 5px; align-items: baseline">
              <label for="pipes_dtm_offset">OFFSET</label>
              <input id="pipes_dtm_offset" type="number" style="width: 100px; margin-left: 5px; padding: 5px;" v-model="offset" :disabled="setdisabled">
              <button style="margin-left: 5px; padding: 3px; font-weight: bold" class="btn skin-button" @click="resetValues" :disabled="setdisabled">RESET</button>
            </th>
          </tr>
        </thead>
        <tbody class="editing_pipes" :style="{height: height + 'px'}">
          <tr v-for="(item, index) in data" style="border-bottom: 1px solid #eeeeee; padding-bottom: 3px; display:flex; justify-content: space-between; align-items: center">
            <td style="padding: 5px;">
              <input type="checkbox" :id="`id_pipe_${item.index}`" class="magic-checkbox checkbox_pipe" @change="selectUnselectItem($event, item.index)" :index="item.index">
              <label :for="`id_pipe_${item.index}`" style="padding: 5px"></label>
            </td>
            <td align="right" style="padding: 5px;">
              sezione: <input class="pipe_section" type="number" style="width: 80px; padding: 5px; font-weight: bold"  v-model="pipes_data[index].section" :disabled="selectitems.indexOf(item) === -1">
              altezza: <input class="pipe_height" type="number" @change="changeItem(item)" style="width: 100px; padding: 5px; font-weight: bold"  v-model="item.value" :disabled="selectitems.indexOf(item) === -1">
            </td>
          </tr>
        </tbody>

      </table>
    </div>
</template>

<script>
  export default {
    name: "pipes",
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
        reset: false
      }
    },
    computed: {
      height() {
        return this.size.height - 10;
      },
      setdisabled() {
        return !this.selectitems.length;
      },
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
        document.querySelector('#select_all_pipes').checked = newLength === this.originalvalues.length;
      },
      offset(currentvalue, oldvalue) {
        if (!this.reset)
          this.selectitems.forEach((item)=> {
            item.value += (+currentvalue) - (+oldvalue);
            this.changeItem(item);
          });
        else
          this.reset = false;
      },
      data(data) {
        this.originalvalues = data.map((item) => item.value);
        for (let i=0; i < this.originalvalues.length; i++) {
          this.pipes_data.push({
            section: this.pipe_section,
            height: null
          });
        }
      }
    },
    methods: {
      setOffsetToZero() {
        this.reset = true;
        this.offset = 0;
      },
      resetValues() {
        this.selectitems.forEach((item) => {
          item.value = this.originalvalues[item.index];
          this.changeItem(item);
        });
        this.setOffsetToZero();
      },
      changeItem(item) {
        this.$emit('change-item', {
          item,
          render: true
        })
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
    beforeDestroy() {
      for (let i =0; i < this.data.length; i++) {
        this.pipes_data[i].height = this.data[i].value;
      }
    }
  }
</script>

<style scoped>
  .editing_pipes {
    overflow-y: auto;
    display:block;
    width: 100%;
  }
</style>
