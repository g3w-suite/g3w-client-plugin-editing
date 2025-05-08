/**
 * @file Initially based on: https://github.com/Viglino/ol-ext/blob/v4.0.30/src/interaction/Transform.js
 * 
 * ol-ext v4.0.30 (https://github.com/Viglino/ol-ext)
 * Copyright 2016-2018 - Jean-Marc Viglino, IGN-France 
 * Licensed under BSD-3-Clause (https://github.com/Viglino/ol-ext/blob/master/LICENSE)
 * 
 * @since 4.0.0
 */
const { GUI } = g3wsdk.gui;

function _setCursor(elt, cursor) {
  if (elt instanceof ol.Map) elt = elt.getTargetElement()
  // prevent flashing on mobile device
  if (!('ontouchstart' in window) && elt instanceof Element) {
    elt.style.cursor = cursor;
  }
}

/**
 * Cursors for transform
 */
const CURSORS = {
  'default':   'auto',
  'select': '   pointer',
  'translate': 'move',
  'rotate':    'move',
  'rotate0':   'move',
};

/**
 * Rotate interaction
 * 
 * @extends ol.interaction.Pointer
 * 
 * @param { Object } options
 * @param { Array } options.features collection of feature to transform,
 */
 export class RotateInteraction extends ol.interaction.Pointer {

  constructor(options = {}) {

    super({
      handleDownEvent: e => this.handleDownEvent_(e),
      handleDragEvent: e => this.handleDragEvent_(e),
      handleUpEvent:   e => this.handleUpEvent_(e),
    })
    
    //Selection Features
    this.selection_ = new ol.Collection();

    // Create a new overlay layer for the sketch
    this.handles_   = new ol.Collection();

    this.overlayLayer_ = new ol.layer.Vector({
      source: new ol.source.Vector({
        features:        this.handles_,
        useSpatialIndex: false,
        wrapX:           false // For vector editing across the -180° and 180° meridians to work properly, this should be set to false
      }),
      name:                   'Rotate overlay',
      displayInLayerSwitcher: false,
      // Return the style according to the handle type
      style: f => this.style[(f.get('handle') || 'default') + (f.get('constraint') || '') + (f.get('option') || '')],
      updateWhileAnimating:   true,
      updateWhileInteracting: true,
    });

    // Collection of feature to transform
    this.features_ = new ol.Collection(options.features);

    this._pointRadius = () => {};

    /* Can rotate the feature */
    this.set('rotate', true);

    /* Handle selection */
    this.set('selection', true);

    /* Enable view rotated transforms */
    this.set('enableRotatedTransform', false);

    /* Keep rectangle angles 90 degrees */
    this.set('keepRectangle', false);

    /* Add buffer to the feature's extent */
    this.set('buffer', 0);

    // Force redraw when changed
    this.on('propertychange',  () => this.drawSketch_() );

    // setstyle
    this.setDefaultStyle();
  }

  /**
   * Remove the interaction from its current map, if any,  and attach it to a new
   * map, if any. Pass `null` to just remove the interaction from the current map.
   * @param {ol.Map} map Map.
   * @api stable
   */
  setMap(map) {
    const oldMap = this.getMap();
    if (oldMap) {
      oldMap.removeLayer(this.overlayLayer_)
      if (this.previousCursor_) {
        _setCursor(oldMap, this.previousCursor_);
      }
      this.previousCursor_ = undefined;
    }
    super.setMap(map);
    this.overlayLayer_.setMap(map);
    if (null === map ) {
      this.select(null);
    }
    if (null !== map) {
      this.isTouch = /touch/.test(map.getViewport().className);
      this.setDefaultStyle();
    }
  }

  /**
   * Activate/deactivate interaction
   * @param {bool}
   * @api stable
   */
  setActive(b) {
    this.select(null)
    if (this.overlayLayer_) {
      this.overlayLayer_.setVisible(b);
    }
    super.setActive(b);
  }

  /**
   * Set default sketch style
   */
  setDefaultStyle() {
    const stroke = new ol.style.Stroke({ color: [255, 0, 0, 1], width: 1 });
    const fill   = new ol.style.Fill({ color: [255, 255, 255, 0.8] });

    const circle = new ol.style.RegularShape({
      fill,
      stroke,
      radius:       this.isTouch ? 12 : 6,
      displacement: this.isTouch ? [24, -24] : [12, -12],
      points:       15
    })

    // Old version with no displacement
    if (!circle.setDisplacement) {
      circle.getAnchor()[0] = this.isTouch ? -10 : -5;
    }

    const bigpt = new ol.style.RegularShape({
      fill,
      stroke,
      radius: this.isTouch ? 16 : 8,
      points: 4,
      angle:  Math.PI / 4
    });

    /** Style for handles */
    this.style = {
      'default': [
          new ol.style.Style({
          image:  bigpt,
          stroke: new ol.style.Stroke({ color: [255, 0, 0, 1], width: 1, lineDash: [4, 4] }),
          fill:   new ol.style.Fill({ color: [255, 0, 0, 0.01] }),
        })
      ],
      'rotate':    [ new ol.style.Style({ image: circle, stroke, fill, }) ],
      'rotate0':   [ new ol.style.Style({ image: bigpt,  stroke, fill }) ],
      'arrow':     feat => 
                    new ol.style.Style({
                      image: new ol.style.Icon({
                        src: `${GUI.getResourcesUrl()}images/Arrow.svg`,
                        width	: 40,
                        height: 40,
                        rotation: ((feat.get('rotation')) * Math.PI) / 180,
                      }),
                    }),       
    }
    this.drawSketch_();
  }

  /**
   * Set sketch style.
   * @param {style} style Style name: 'default','translate','rotate','rotate0','scale','scale1','scale2','scale3','scalev','scaleh1','scalev2','scaleh3'
   * @param {ol.style.Style|Array<ol.style.Style>} olstyle
   * @api stable
   */
  setStyle(style, olstyle) {
    if (!olstyle) { return }
    if (olstyle instanceof Array) { this.style[style] = olstyle }
    else { this.style[style] = [olstyle] }
    
    for (let i = 0; i < this.style[style].length; i++) {
      const im = this.style[style][i].getImage();
      if (im && style == 'rotate') {
        im.getAnchor()[0] = -5;
      }
        
      if (im && this.isTouch) {
        im.setScale(1.8)
      }

      const tx = this.style[style][i].getText();

      if (tx && style == 'rotate') {
        tx.setOffsetX(this.isTouch ? 14 : 7);
      }
      
      if (tx && this.isTouch) {
        tx.setScale(1.8);
      }
    }

    this.drawSketch_();
  }

  /** Get Feature at pixel
   * @param {ol.Pixel}
   * @return {ol.feature}
   * @private
   */
  getFeatureAtPixel_(pixel) {
    return this.getMap().forEachFeatureAtPixel(pixel,
      feature => {
        if (this.handles_.getArray().find(f => feature === f)) {
          return { feature, handle: feature.get('handle'), constraint: feature.get('constraint'), option: feature.get('option') }
        }
      },
      { hitTolerance: (isMobile && isMobile.any) ? 10 : 0 }
    ) || {}
  }

  /** Rotate feature from map view rotation
   * @param {ol.Feature} f the feature
   * @param {boolean} clone clone resulting geom
   * @param {ol.geom.Geometry} rotated geometry
   */
  getGeometryRotateToZero_(f, clone) {
    const origGeom     = f.getGeometry();
    const viewRotation = this.getMap().getView().getRotation();
    if (0 === viewRotation || !this.get('enableRotatedTransform')) {
      return clone ? origGeom.clone() : origGeom;
    }
    const rotGeom = origGeom.clone();
    rotGeom.rotate(viewRotation * -1, this.getMap().getView().getCenter());
    return rotGeom;
  }

  /** Test if rectangle
   * @param {ol.Geometry} geom
   * @returns {boolean}
   * @private
   */
  _isRectangle(geom) {
    return this.get('keepRectangle') && 'Polygon' === geom.getType() && 5 === geom.getCoordinates()[0].length;
  }

  /** Draw transform sketch
  * @param {boolean} draw only the center
  */
  drawSketch_(center) {
    let f, geom;
    //check if geometry is a rectangle
    const keepRectangle = this.selection_.item(0) && this._isRectangle(this.selection_.item(0).getGeometry());
    //clear overlay source features
    this.overlayLayer_.getSource().clear();
    //If no selection feature, skip
    if (!this.selection_.getLength()) { return; }
    //get roptation of map
    const viewRotation = this.getMap().getView().getRotation();
    //get extent of selected feature
    let ext = this.getGeometryRotateToZero_(this.selection_.item(0)).getExtent();
    let coords;
    //In case of rectangle
    if (keepRectangle) {
      coords = this.getGeometryRotateToZero_(this.selection_.item(0)).getCoordinates()[0].slice(0, 4);
      coords.unshift(coords[3]);
    }
    // Clone and extend
    ext = ol.extent.buffer(ext, this.get('buffer'));
    this.selection_.forEach(f => ol.extent.extend(ext, this.getGeometryRotateToZero_(f).getExtent()));

    let ptRadius = (1 === this.selection_.getLength() ? this._pointRadius(this.selection_.item(0)) : 0);
    if (ptRadius && !(ptRadius instanceof Array)) {
      ptRadius = [ptRadius, ptRadius];
    }
    if (true === center) {
      if (!this.ispt_) {
        this.overlayLayer_.getSource().addFeature(new ol.Feature({ geometry: new ol.geom.Point(this.center_), handle: 'rotate0' }));
        geom = ol.geom.Polygon.fromExtent(ext);
        if (this.get('enableRotatedTransform') && 0 !== viewRotation) {
          geom.rotate(viewRotation, this.getMap().getView().getCenter());
        }
        f = this.bbox_ = new ol.Feature(geom);
        this.overlayLayer_.getSource().addFeature(f);
      }
    } else {
      if (this.ispt_) {
        // Calculate extent around the point
        const p = this.getMap().getPixelFromCoordinate(ol.extent.getCenter(ext));
        if (p) {
          const dx = ptRadius ? ptRadius[0] || 10 : 10;
          const dy = ptRadius ? ptRadius[1] || 10 : 10;
          ext = ol.extent.boundingExtent([
            this.getMap().getCoordinateFromPixel([p[0] - dx, p[1] - dy]),
            this.getMap().getCoordinateFromPixel([p[0] + dx, p[1] + dy])
          ])
        }
      }
      geom = keepRectangle ? new ol.geom.Polygon([coords]) : ol.geom.Polygon.fromExtent(ext);
      if (this.get('enableRotatedTransform') && 0 !== viewRotation) {
        geom.rotate(viewRotation, this.getMap().getView().getCenter());
      }
      f = this.bbox_ = new ol.Feature(geom);
      const features = [];
      const g = geom.getCoordinates()[0];
      if (!this.ispt_ || ptRadius) {
        features.push(f);
      }
     
      features.push(new ol.Feature({ geometry: new ol.geom.Point(g[3]), handle: 'rotate' }));
      
      // Add sketch
      this.overlayLayer_.getSource().addFeatures(features);
    }
  }

  /**
   * Select a feature to transform
   * 
   * @param {ol.Feature} feature the feature to transform
   * @param {boolean} add true to add the feature to the selection, default false
   * 
   * @fires select
   */
  select(feature) {
    if (!feature && this.selection_) {
      this.selection_.clear();
      this.drawSketch_();  
    }
    if (!feature || !feature.getGeometry || !feature.getGeometry()) { return }

    // Add to selection
    this.selection_.push(feature)
    //Chanck if is point feature
    this.ispt_     = 'Point' === feature.getGeometry().getType();

    if (this.ispt_) {
      //store previous point rotaion degree
      this.pdegrees_ = null;
      //need to wait selection set style
      setTimeout(() => {
        //get original style of the feature
        this.oriStyle = feature.getStyle();
        //set arrow style
        feature.setStyle(this.style['arrow']);
      })
    }

    
    this.drawSketch_();
    this.watchFeatures_();
    // select event
    this.dispatchEvent({ type: 'select', feature, features: this.selection_ });
  }

  /** Watch selected features
   * @private
   */
  watchFeatures_() {
    // Listen to feature modification
    if (this._featureListeners) {
      this._featureListeners.forEach(l => ol.Observable.unByKey(l));
    }
    this._featureListeners = this.selection_.getArray().map(f  => 
      f.on('change', () => {
        if (!this.isUpdating_) {
          this.drawSketch_();
        }
      })
    )
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * 
   * @return {boolean} `true` to start the drag sequence.
   * 
   * @private
   * 
   * @fires select
   * @fires rotatestart
   * @fires translatestart
   * @fires scalestart
   */
  handleDownEvent_(evt) {
    const sel          = this.getFeatureAtPixel_(evt.pixel);
    const feature      = sel.feature;
    if (!feature) {return false; }
    this.mode_         = sel.handle;
    this.opt_          = sel.option;
    this.constraint_   = sel.constraint;
    this.oriStyle      = feature.getStyle();
    // Save info
    const viewRotation = this.getMap().getView().getRotation();
    // Get coordinate of the handle (for snapping)
    this.coordinate_   = feature.get('handle') ? feature.getGeometry().getCoordinates() : evt.coordinate;
    this.pixel_        = this.getMap().getCoordinateFromPixel(this.coordinate_); // evt.pixel;
    this.geoms_        = [];
    this.rotatedGeoms_ = [];
    let extent         = ol.extent.createEmpty();
    let rotExtent      = ol.extent.createEmpty();
    for (let i = 0, f; f = this.selection_.item(i); i++) {
      this.geoms_.push(f.getGeometry().clone());
      extent = ol.extent.extend(extent, f.getGeometry().getExtent());
      if (this.get('enableRotatedTransform') && 0 !== viewRotation) {
        const rotGeom = this.getGeometryRotateToZero_(f, true);
        this.rotatedGeoms_.push(rotGeom);
        rotExtent = ol.extent.extend(rotExtent, rotGeom.getExtent());
      }
    }
    this.extent_ = (ol.geom.Polygon.fromExtent(extent)).getCoordinates()[0];
    if (this.get('enableRotatedTransform') && 0 !== viewRotation) {
      this.rotatedExtent_ = (ol.geom.Polygon.fromExtent(rotExtent)).getCoordinates()[0];
    }
    
    this.center_  = this.getCenter() || ol.extent.getCenter(extent);
    // we are now rotating (cursor down on rotate mode), so apply the grabbing cursor
    const element = evt.map.getTargetElement();
    _setCursor(element, CURSORS.rotate0);
    this.previousCursor_ = element.style.cursor;
    this.angle_          = Math.atan2(this.center_[1] - evt.coordinate[1], this.center_[0] - evt.coordinate[0]);

    this.dispatchEvent({
      type:       this.mode_ + 'start',
      feature:    this.selection_.item(0),
      features:   this.selection_,
      pixel:      evt.pixel,
      coordinate: evt.coordinate
    });

    return true
  }

  /**
   * Get the rotation center
   * @return {ol.coordinate|undefined}
   */
  getCenter() {
    return this.get('center');
  }

  /**
   * Set the rotation center
   * @param {ol.coordinate|undefined} c the center point, default center on the objet
   */
  setCenter(c) {
    return this.set('center', c);
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * 
   * @private
   * 
   * @fires rotating
   * @fires translating
   * @fires scaling
   */
  handleDragEvent_(evt) {
    let i, f, geometry;
    const feature    = this.selection_.item(0);
    const pt         = [evt.coordinate[0], evt.coordinate[1]];
    this.isUpdating_ = true;
    const a = Math.atan2(this.center_[1] - pt[1], this.center_[0] - pt[0]);
    //No Point geometry type
    if (!this.ispt_) {
      for (i = 0, f; f = this.selection_.item(i); i++) {
        geometry = this.geoms_[i].clone();
        geometry.rotate(a - this.angle_, this.center_);
        f.setGeometry(geometry);
      }
    }

    //Point Geometry type
    if (this.ispt_) {
      //get rotation degree
      let degrees = (a * (180 / Math.PI)); // between -180 to 180 (start at 145 lower right to bbox)
      if (null === this.pdegrees_) {
        this.pdegrees_ = degrees;
      }      

      //get direction (clockwise or not)
      const clockwise       = (this.pdegrees_ > degrees) || (this.pdegrees_ > degrees);
      //get current rotation
      let rotation = Number(feature.get('rotation'));
      if (rotation >= 360) {
        rotation = (clockwise ? 0 : 360);
      }
      //set rotation
      feature.set('rotation', rotation + (clockwise ? 1 : -1))
      this.pdegrees_ = degrees;

    }

    this.drawSketch_(true);

    this.dispatchEvent({
      type:       'rotating',
      feature,
      features:   this.selection_,
      angle:      a - this.angle_,
      pixel:      evt.pixel,
      coordinate: evt.coordinate
    })
      
    this.isUpdating_ = false;
  }

  /**
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * @return {boolean} `false` to stop the drag sequence.
   * 
   * @fires rotateend
   * @fires translateend
   * @fires scaleend
   */
  handleUpEvent_(evt) {
    // remove rotate0 cursor on Up event, otherwise it's stuck on grab/grabbing
    const feature = this.selection_.item(0);
    _setCursor(evt.map.getTargetElement(), CURSORS.default);
    this.previousCursor_ = undefined;

    this.dispatchEvent({
      type:     this.mode_ + 'end',
      feature,
      features: this.selection_,
      oldgeom:  this.geoms_[0],
      oldgeoms: this.geoms_
    })

    this.drawSketch_();
    this.mode_     = null;
    this.pdegrees_ = null;
    return false;
  }

  /** Get the features that are selected for transform
   * @return ol.Collection
   */
  getFeatures() {
    return this.selection_;
  }

}