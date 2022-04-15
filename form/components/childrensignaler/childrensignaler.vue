<template>
    <div class="childrensignaler_content" style="margin-top: 10px; background-color: #FFFFFF; padding: 5px;">
        <div class="skin-color-dark" style="font-size: 1.2em; font-weight: bold"></div>

        <div class="g3w-signale_iim_plugin_children_signaler_tools" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <div style="width: 100%" v-t-tooltip:top.create="'plugins.signaler_iim.signaler.reload'">
                <button style="width: 100%" v-disabled="loading" class="btn skin-button"  @click.stop.prevent="loadChildrenData" :class="g3wtemplate.font['refresh']"></button>
            </div>
        </div>
        <div class="g3w_signaler_iim_children_signaler_message">
            <div v-t-plugin="'signaler_iim.signaler.children_signaler_message.1'"></div>
            <div v-t-plugin="'signaler_iim.signaler.children_signaler_message.2'"></div>
        </div>
        <bar-loader :loading="loading"></bar-loader>
        <div v-if="loading == false" class="g3w-signale_iim_plugin_children_signaler_data" v-disabled="disabled">
            <div v-for="childsignaler in childrendsignaler" :key="childsignaler.type" class="skin-border-color" style="padding: 5px; border-style: solid; border-width: 2px 0 0 0">
                <div class="childsignaler_header" style="display: flex; justify-content: space-between">
                    <div class="child_title skin-color" style="font-weight: bold; font-size: 1.1em;" v-t-plugin="`signaler_iim.signaler.signaler_types.${childsignaler.type}`"></div>
                    <div v-t-tooltip:top.create="'plugins.signaler_iim.signaler.add_new_child_signaler'">
                        <button class="btn skin-button" :class="g3wtemplate.font['plus']" @click.stop.prevent="addChildSignaler(childsignaler.url)"></button>
                    </div>
                </div>
                <ul v-if="childsignaler.rules" style="padding-left: 20px;">
                    <template v-for="rule in childsignaler.rules">
                        <li v-show="rule.msg.show">{{rule.msg.label}}</li>
                    </template>
                </ul>
                <div v-for="child in childsignaler.features" style="display: flex; align-items: baseline; padding: 2px 0 2px 0; border-bottom: 1px solid #eeeeee">
                    <div v-t-tooltip:right.create="'plugins.signaler_iim.signaler.edit_child_signaler'">
                        <button class="btn skin-button" style="margin-right: 5px;" :class="g3wtemplate.font['pencil']" @click.stop.prevent="editChildFeature({url: childsignaler.url, id:child.id})"></button>
                    </div>
                    <div v-t-tooltip:top.create="'plugins.signaler_iim.signaler.delete_child_signaler'">
                        <button class="btn btn-danger" style="margin-right: 5px; color: #FFFFFF" :class="g3wtemplate.font['trash']" @click.stop.prevent="deleteChildFeature({project_id: childsignaler.project_id, layer_id: childsignaler.layer_id, feature_id: child.id})"></button>
                    </div>
                    <div style="font-weight: bold">{{child.id}}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
    const {toRawType} = g3wsdk.core.utils;
    const EditingService = require('../../../services/editingservice');
    export default {
        name: 'Childrensignaler',
        props: {
          fields: {
              type: Array
          }
        },
        data(){
            const {urls: {signal_type_maps}, relation_signal_types} = SIGNALER_IIM_CONFIG;
            const childrendsignaler = Object.keys(relation_signal_types).map(type => {
                const {rules=[]} = relation_signal_types[type];
                rules.forEach(({rule, msg}) =>{
                    if (toRawType(rule) === 'Object') {
                        const field = this.fields.find(field => field.name === rule.field);
                        const unwatch = this.$watch(()=> field.value, value => msg.show = value == rule.value, {immediate: true});
                        this.unwatches_fields_rules.push(unwatch);
                    }
                });
                return {
                    url: signal_type_maps[type],
                    ...relation_signal_types[type],
                    features: [],
                    type
                }
            });
            return {
                loading: true,
                disabled: false,
                childrendsignaler
            }
        },
        methods: {
            loadChildrenData(){
                this.loading = true;
                const promises = [];
                this.childrendsignaler.forEach(({layer_id, features, project_id}, index) =>{
                    this.childrendsignaler[index].features = [];
                    promises.push(EditingService.getChildrenSignaler({
                        project_id,
                        layer_id,
                        signalerFieldValue: this.currentChildSignalerFieldValue
                    }))
                });
                Promise.allSettled(promises).then(responses =>{
                    responses.forEach(({status, value}, index) => {
                        const {result, vector:{data}} = value;
                        if (status === 'fulfilled' && result)
                            data.features.forEach(feature => this.childrendsignaler[index].features.push(feature));
                    })
                }).finally(()=>this.loading = false);
            },
            editChildFeature({url, id}){
                window.open(`${url}?sid_edit=${id}&segn_pad_id=${this.currentChildSignalerFieldValue}`, '_blank').focus();
            },
            addChildSignaler(url){
                window.open(`${url}?sid=new&segn_pad_id=${this.currentChildSignalerFieldValue}`, '_blank').focus();
            },
            async deleteChildFeature({layer_id, project_id, feature_id}={}){
                await EditingService.deleteChildFeature({layer_id, project_id, feature_id});
                this.loadChildrenData();
            }
        },
        beforeCreate() {
            this.unwatches_fields_rules = [];
        },
        created(){
            const {every_fields_editing_states} = SIGNALER_IIM_CONFIG;
            const state_field = this.fields.find(field => field.name === SIGNALER_IIM_CONFIG.state_field);
            this.disabled = every_fields_editing_states.indexOf(state_field.value) === -1;
            this.currentChildSignalerFieldValue = `${EditingService.getCurrentReportData().id}:${SIGNALER_IIM_CONFIG.signal_type}`;
        },
        beforeMount() {
            this.loadChildrenData();
        },
        beforeDestroy() {
            this.currentChildSignalerFieldValue = null;
            this.unwatches_fields_rules.forEach(unwatch => unwatch());
        }
    };
</script>

<style scoped>
    .g3w_signaler_iim_children_signaler_message {
        padding: 5px;
        text-align: justify;
        background-color: #384246;
        color: #FFFFFF;
        margin-bottom: 3px;
    }
</style>
