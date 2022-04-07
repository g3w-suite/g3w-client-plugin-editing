<template>
    <div>
        <div style="background-color: #FFFFFF; margin: 4px 0 5px 0; padding: 5px;">
            <div v-for="info in signaler_father_info" style="margin-right: 3px; font-size: 1.3em">
                <span style="font-weight: bold" class="skin-color-dark">{{info.label}}</span>
                <span> : </span>
                <span>{{info.value}}</span>
            </div>
        </div>
        <slot name="content"></slot>
    </div>
</template>

<script>
    const {GUI, ComponentsFactory} = g3wsdk.gui;
    const EditingService = require('../../services/editingservice');
    export default {
        name: 'reportinfo',
        data(){
            return {
                signaler_father_info:[]
            }
        },
        mounted(){
            console.log(this.signaler_father_info)
            setTimeout(()=>{
                Object.values(EditingService.getCurrentReportData().ab_signal_fields).filter(({label}) => label).forEach(({label, value}) =>{
                    this.signaler_father_info.push({
                        label,
                        value
                    });
                })
            })

        }
    };
</script>
