<template>
    <div class="g3w_signale_iim_signaler_notes_content" style="display: flex; flex-direction: column; justify-content: space-between; background-color: #FFFFFF">
        <div v-if="notes.length">
            <div v-for="note in notes" :key="note.id" style="padding: 3px">
                <div style="border-bottom: 1px solid #eeeeee">
                    <div class="note_info_divider">
                        <span style="font-weight: bold; margin-right: 5px;" v-t-plugin="`signaler_iim.signaler.note_info.from_state`"></span>
                        <span>{{note.from_state}}</span>
                        <span style="font-weight: bold; margin-right: 5px;" v-t-plugin="`signaler_iim.signaler.note_info.to_state`"></span>
                        <span>{{note.to_state}}</span>
                    </div>
                    <div class="note_info_divider">
                        <span style="font-weight: bold; margin-right: 5px;" v-t-plugin="`signaler_iim.signaler.note_info.created`"></span>
                        <span>{{note.created}}</span>
                    </div>
                    <div class="note_info_divider">
                        <span style="font-weight: bold; margin-right: 5px;" v-t-plugin="`signaler_iim.signaler.note_info.user`"></span>
                        <span>{{note.user}}</span>
                    </div>
                    <div>
                        <span style="font-weight: bold; margin-right: 5px;" v-t-plugin="`signaler_iim.signaler.note_info.note`"></span>
                        <span>{{note.note}}</span>
                    </div>
                </div>
                <div class="skin-border-color" style="border-bottom: 2px solid; margin-bottom: 5px;"></div>
            </div>
        </div>
        <div v-else style="font-weight: bold; padding: 5px" v-t-plugin="'signaler_iim.signaler.no_notes'"></div>
        <div v-if="back" style="align-self: center">
            <button class="btn skin-button" style="width: 100%; font-weight: bold; margin: 5px;" @click="backToForm" v-t="'back'"></button>
        </div>
    </div>
</template>

<script>
    const {GUI} = g3wsdk.gui;
    export default {
        name: 'signalernotes',
        props: {
          notes: {
              type: Array
          },
          back: {
            type: Boolean
          }
        },
        methods: {
            backToForm() {
                GUI.popContent();
            }
        }
    };
</script>

<style scoped>
    .note_info_divider{
        border-bottom: 1px solid #eeeeee;
    }
</style>
