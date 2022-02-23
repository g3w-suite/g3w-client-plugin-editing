const {base, inherit} = g3wsdk.core.utils;
const GUI = g3wsdk.gui.GUI;
const Workflow = g3wsdk.core.workflow.Workflow;
const Layer = g3wsdk.core.layer.Layer;
const {isPointGeometryType} = g3wsdk.core.geometry.Geometry;

function EditingWorkflow(options={}) {
  base(this, options);
  this.helpMessage = options.helpMessage ? {help:options.helpMessage} : null;
  this._toolsoftool = [];
}

inherit(EditingWorkflow, Workflow);

const proto = EditingWorkflow.prototype;

proto.addToolsOfTools = function({step, tools=[]}){
  const toolsOfTools = {
    snap: {
      type: 'snap',
      options: {
        checkedAll: false,
        checked: false,
        active: true,
        run({layer}){
          this.active = true;
          this.layerId = this.layerId || layer.getId();
          this.source = this.source || layer.getEditingLayer().getSource();
        },
        stop(){
          this.active = false;
        }
      }
    },
    measure:  {
      type: 'measure',
      options: {
        checked: false,
        run(){
          setTimeout(()=>{
            this.onChange(this.checked);
          })
        },
        stop(){
          step.getTask().removeMeasureInteraction();
        },
        onChange(bool){
          this.checked = bool;
          step.getTask()[bool ? 'addMeasureInteraction':  'removeMeasureInteraction']();
        },
        onBeforeDestroy(){
          this.onChange(false);
        }
      }
    }
  };
  step.on('run', ({inputs, context}) => {
    const layer = inputs.layer;
    if (this._toolsoftool.length == 0) {
      tools.forEach(tool =>{
        if (tool === 'measure') {
          if (layer.getType() === Layer.LayerTypes.VECTOR && !isPointGeometryType(layer.getGeometryType()))
            this._toolsoftool.push(toolsOfTools[tool]);
        } else this._toolsoftool.push(toolsOfTools[tool]);
      });
    }
    this._toolsoftool.forEach(tooloftool=> tooloftool.options.run({layer}));
    this.emit('settoolsoftool', this._toolsoftool);
  });
  step.on('stop', () => {
    this._toolsoftool.forEach(tooloftool=> tooloftool.options.stop());
  });
};

proto.setHelpMessage = function(message) {
  this.helpMessage = {
    help: message
  };
};

proto.getHelpMessage = function(){
  return this.helpMessage;
};

proto.getFeatures = function() {
  return this.getInputs().features;
};

proto.startFromLastStep = function(options) {
  let steps = this.getSteps();
  this.setSteps([steps.pop()]);
  return this.start(options);
};

proto.getCurrentFeature = function() {
  const features = this.getFeatures();
  const length = this.getFeatures().length;
  return features[length -1];
};

proto.getLayer = function() {
  return this.getSession().getEditor().getLayer()
};

proto.getSession = function() {
  return this.getContext().session;
};

//bind interrupt event
proto.escKeyUpHandler = function(evt) {
  if (evt.keyCode === 27) {
    evt.data.workflow.reject();
    evt.data.callback();
  }
};

proto.unbindEscKeyUp = function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
};

proto.bindEscKeyUp = function(callback=()=>{}) {
  const percContent = GUI.hideContent(true);
  $(document).on('keyup', {
    workflow: this,
    callback
  }, this.escKeyUpHandler);
  return percContent;
};

proto.registerEscKeyEvent = function(callback){
  this.on('start', ()=> {
    this.bindEscKeyUp(callback);
  });
  this.on('stop', ()=>{
    this.unbindEscKeyUp()
  });
};
/////

module.exports = EditingWorkflow;
