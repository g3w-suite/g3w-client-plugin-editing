/**
 * @file ORIGINAL SOURCE: g3w-client/src/services/iframe.js@4.0.0
 * 
 * @since 4.1.0
 * 
 * @example template.html
 * 
 * ```html
 * <!DOCTYPE html>
 * <html lang="en" style="width: 100%; height: 100%">
 * <head>
 *   <meta charset="UTF-8">
 *   <title>Test Iframe</title>
 * </head>
 * <body style="width:100%; height: 100%; margin: 0;">
 * <iframe style="width: 100%; height: 100%; border: 0;" src="http://192.168.1.4:3000/?project=test-iframe/qdjango/62"></iframe>
 * </body>
 * <script>
 *   // send message to iframe when app is ready
 *   const iframe = document.querySelector('iframe');
 *   window.addEventListener('message', evt => {
 *     const { action, response } = evt.data;
 *     if (action === "editing:ready") {
 *       setTimeout(() => iframe.contentWindow.postMessage({
 *         id: null,                     // id of action,
 *         action: "<context>:<action>", // eg: "editing:update"
 *         data: {}                      // data contain all mandatory attribute information
 *       }, '*'), 2000)
 *     }
 *   }, false);
 * </script>
 * </html>
 * ```
 */

const { ApplicationState, G3WObject } = g3wsdk.core;
const { GUI }                         = g3wsdk.gui;
const { DataRouterService }           = g3wsdk.core.data;
const { getUniqueDomId }              = g3wsdk.core.utils;

export class IframeEditor extends G3WObject {

  pending = undefined;

  subscribevents = [];

  isRunning = false;

  responseObject = {
    cb:           null, // resolve or reject promise method
    qgs_layer_id: null,
    error:        null,
  };

  config =  {
    tools: {
      add: {
        disabled:[
          { id: 'deletefeature' },
          { id: 'copyfeatures' },
          { id: 'editmultiattributes' },
          { id: 'deletePart' },
          { id: 'splitfeature' },
          { id: 'mergefeatures' },
        ]
      },
      update: {
        disabled: [
          { id: 'addfeature' },
          { id: 'copyfeatures' },
          { id: 'deletefeature' },
          { id: 'editmultiattributes' },
          { id: 'deletePart' },
          { id: 'splitfeature' },
          { id: 'mergefeatures' },
        ]
      },
      delete: {
        enabled: [
          { id:'deletefeature', options: { active: true } },
        ]
      }
    }
  };

  constructor(plugin) {

    super();

    // BACKOMP v3.x
    plugin.getEditableLayersId = plugin.getEditableLayersId || (() => Object.keys(plugin.getEditableLayers()));
    plugin.hidePanel           = plugin.hidePanel           || plugin.hideEditingPanel;
    plugin.resetDefault        = plugin.resetDefault        || plugin.resetAPIDefault;
    plugin.subscribe           = plugin.subscribe           || plugin.on;
    plugin.unsubscribe         = plugin.unsubscribe         || plugin.off;

    // handle all messages from the window
    window.addEventListener('message', async message => {
      if (!message?.data.action?.startsWith('editing:')) {
        return;
      }
      const id = undefined !== message.data.id ?  message.data.id : getUniqueDomId();
      try {
        // stop pending actions
        if (message.data.single ?? true) {
          await Promise.allSettled(Object.keys(this.pending).map(id => {
            delete this.pending[id];
            return this['editing:stop']();
          }));
        }
        this.pending[id] = {};
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: true,
            data:   'function' === typeof this[message.data.action] ? await this[message.data.action](message.data.data) : undefined
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: false,
            data: e
          }
        }, '*');
      }
      delete this.pending[id];
    }, false);
  }

  /**
   * Return a qgs_layer_id array based on passed qgis_layer_id
   * 
   * @param { Object } opts
   * @param { string | string[] | null | undefined } opts.qgs_layer_id
   * @param { Array } noValue
   * 
   * @returns { string[] } qgs_layer_id
   * 
   * @private
   */
  'editing:getQgsLayerId'({
    qgs_layer_id,
    noValue,
  }) {
    return qgs_layer_id ? [].concat(qgs_layer_id) : noValue;
  };

  /**
   * getFeature from DataProvider
   * 
   * @private
   */
  async 'editing:searchFeature'({
    layer,
    feature,
  }) {
    const { data = [] } = await DataRouterService.getData('search:features', {
      inputs: {
        layer,
        filter: [].concat(feature.value).map(v => `${feature.field}|eq|${encodeURIComponent(v)}`).join('|OR,')
      },
      outputs: false
    });
    return data;
  };

  /**
   * Search feature(s) by field and value
   * 
   * @param { Object } opts
   * @param opts.qgs_layer_id
   * @param opts.feature
   * @param opts.zoom
   * @param opts.highlight
   * 
   * @returns { Promise<{ qgs_layer_id: null, features: [], found: boolean }>}
   */
  async 'editing:findFeaturesWithGeometry'({
    feature,
    qgs_layer_id = [],
    zoom         = false,
    highlight    = false,
  } = {}) {
    const response = {
      found:        false,
      features:     [],
      qgs_layer_id: null
    };
    let layersCount = qgs_layer_id.length;
    let i = 0;
    while (!response.found && i < layersCount) {
      const layer = ApplicationState.project.getLayerById(qgs_layer_id[i]);
      try {
        const data     = layer && await this['editing:searchFeature']({ layer, feature });
        const features = data.length && data[0].features;
        response.found = features && features.length > 0 && !!features.find(f => f.getGeometry());
        if (!features || !response.found) {
          throw 'invalid response';
        }
        response.features     = features;
        response.qgs_layer_id = qgs_layer_id[i];
        if (zoom) {
          await GUI.getService('map').zoomToFeatures(features, { highlight });
        }
      } catch(e) { i++; console.warn(e);}
    }
    // in case of no response zoom to an initial extent
    if (!response.found) {
      GUI.getService('map').zoomToExtent(GUI.getService('map').project.state.initextent)
    }
    return response;
  }

  /**
   * run before each action
   */
  async 'editing:startAction'({
    toolboxes,
    resolve,
    reject,
  }) {

    this.responseObject.cb = reject;

    // set same mode autosave
    GUI.getPlugin('editing').setSaveConfig({
      cb: {
        // called when commit changes are done successuffly
        done: toolbox => {
          //set toolbox id
          this.responseObject.cb           = resolve;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = null;
          // close panel that fire closeediting panel event
          GUI.getPlugin('editing').hidePanel();
        },
        // called whe commit change receive an error
        error: (toolbox, error) => {
          this.responseObject.cb           = reject;
          this.responseObject.qgs_layer_id = toolbox.getId();
          this.responseObject.error        = error;
        },
      }
    });

    // set toolboxes visible base on the value of qgs_layer_id
    GUI.getPlugin('editing').showPanel({ toolboxes });

    this.isRunning = true;
  }

  /**
   * run after each action
   */
  async 'editing:stopAction'(opts = {}) {
    if (opts.qgs_layer_id) {
      await this['editing:stopEditing'](opts.qgs_layer_id);
    }
  }

  /**
   * add subscribe refenrence
   */
  'editing:addSubscribeEvents'(event, options = {}) {
    const handler = ({

      canUndo:({ activeTool, disableToolboxes = [] }) => bool => {
        //set currenttoolbocx id in editing to null
        if (false === bool) {
          this.responseObject.qgs_layer_id = null;
          this.responseObject.error        = null;
        }
        activeTool.setEnabled(!bool);
        disableToolboxes.forEach(toolbox => toolbox.setEditing(!bool))
      },

      canRedo:() => {},
      cancelform:cb => () => { cb() }, // runs callback

      addfeature: ({ properties, toolboxes } = {}) => feature => {

        Object
          .keys(properties)
          .forEach(p => feature.set(p, properties[p]));

        let activeTool;
        const disableToolboxes = [];

        toolboxes
          .forEach(t => {
            const tool = t.getToolById('addfeature');
            if (tool.isActive()) {
              tool.setEnabled(false);
              activeTool = tool;
            } else {
              t.setEditing(false);
              disableToolboxes.push(t)
            }
          });

        // just one time
        if (this.subscribevents.find(e => 'canUndo' !== e.event)) {
          this['editing:addSubscribeEvents']('cancelform', this['editing:addSubscribeEvents']('canUndo', { activeTool, disableToolboxes }));
        }
      },

      closeeditingpanel: ({ qgs_layer_id }) => () => {
        // response to router service
        this.responseObject.cb({
          qgs_layer_id: this.responseObject.qgs_layer_id,
          error:        this.responseObject.error,
        });
        // stop action
        this['editing:stopAction']({ qgs_layer_id });
      },

    })[event](options);
    GUI.getPlugin('editing').subscribe(event, handler);
    this.subscribevents.push({ event, handler });
    return handler;
  };

  /**
   * Reset subscriber editing plugin events
   */
  'editing:resetSubscribeEvents'() {
    this.subscribevents.forEach(d => { GUI.getPlugin('editing').unsubscribe(d.event, d.handler); });
  };

  /**
   * Called whe we want to add a feature
   * 
   * @param { Object } config
   * @param config.qgs_layer_id
   * @param config.properties
   * 
   * @returns { Promise<void> }
   */
  'editing:add'(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      // extract `qgs_layer_id9` from a configuration message
      const { qgs_layer_id: configQglLayerId, ...data } = config;
      const { properties }                              = data;

      const qgs_layer_id = this['editing:getQgsLayerId']({
        qgs_layer_id: configQglLayerId,
        noValue:      GUI.getPlugin('editing').getEditableLayersId(),
      });

      // call method common
      await this['editing:startAction']({ toolboxes: qgs_layer_id, resolve, reject });
        // return all toolboxes
      const toolboxes = (
          await this['editing:startEditing'](qgs_layer_id, {
            tools:            this.config.tools.add,
            startstopediting: false,
            action :          'add',
            selected:         1 === qgs_layer_id.length,
          })
        )
        .filter(p => 'fulfilled' === p.status)
        .map(p => p.value);

           /** @FIXME add description */
      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      /** @FIXME add description */
      if (1 === toolboxes.length && toolboxes[0]) {
        toolboxes[0].setActiveTool(toolboxes[0].getToolById('addfeature'));
      }

      // in case of no feature add avent subscribe
      this['editing:addSubscribeEvents']('addfeature', { properties, toolboxes });
      this['editing:addSubscribeEvents']('closeeditingpanel', { qgs_layer_id })
    });
  }

  /**
   * Called when we want to update a know feature field
   * 
   * @param config
   * 
   * @returns { Promise<unknown> }
   */
  async update(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      const { qgs_layer_id: configQglLayerId, ...data } = config;
      const { feature } = data;
      const qgs_layer_id = this['editing:getQgsLayerId']({
        qgs_layer_id: configQglLayerId,
        noValue:      GUI.getPlugin('editing').getEditableLayersId(),
      });

      const response = await this['editing:findFeaturesWithGeometry']({
        qgs_layer_id,
        feature,
        zoom:      true,
        highlight: true,
        selected:  1 === qgs_layer_id.length // set selected toolbox
      });

      // skip when ..
      if (!response.found) {
        return reject();
      }

      await this['editing:startAction']({ toolboxes: [response.qgs_layer_id], resolve, reject });

      // return all toolboxes
      await this['editing:startEditing']([response.qgs_layer_id], {
        feature,
        tools:            this.config.tools.update,
        startstopediting: false,
        action:           'update',
      });

      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      this['editing:addSubscribeEvents']('closeeditingpanel', { qgs_layer_id: [response.qgs_layer_id] });
    });
  }

  /**
   * Called when we want to start editing
   * 
   * @param { Array } qgs_layer_id
   * @param { Object } options
   * 
   * @returns { Promise< unknown | void > }
   */
  async 'editing:startEditing'(qgs_layer_id = [], options = {}) {
    const { action = 'add', feature } = options;
    const filter                      = {};
    options.filter                    = filter;
    switch (action) {
      case 'add':    filter.nofeatures = true;                                   break;
      case 'update': filter.field      = `${feature.field}|eq|${feature.value}`; break;
    }
    //only in case of one layer id start editing otherwise client need to click on the layer
    return await Promise.allSettled((1 === qgs_layer_id.length ? qgs_layer_id : [])
      .map(id => GUI.getPlugin('editing').startEditing(id, options) ));

  }

  /**
   * Stop editing
   * 
   * @param qgs_layer_id
   * 
   * @returns { Promise<unknown> }
   */
  async 'editing:stopEditing'(qgs_layer_id) {
    const promises = [];
    qgs_layer_id.forEach(id => { promises.push(GUI.getPlugin('editing').stopEditing(id)); });
    await Promise.allSettled(promises);
    this['editing:clear']();
  }

  'editing:stop'() {
    return new Promise(resolve => {
      GUI.getPlugin('editing').hidePanel();
      GUI.hideSidebar();
      this.once('clear', resolve);
    });
  }

  /**
   * Called wen we want to reset default editing plugin behaviour
   */
  'editing:clear'() {
    GUI.getPlugin('editing').resetDefault();
    this.isRunning      = false;
    this.responseObject = {
      cb:           null, // resolve or reject promise method
      qgs_layer_id: null,
      error:        null,
    };
    this['editing:resetSubscribeEvents']();
    this.emit('clear');
  }

}