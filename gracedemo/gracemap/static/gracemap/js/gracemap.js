var gdView;

var stylesSearch = {
    'point': [new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({
                    color: 'rgba(255,0,0,0.7)',
            }),
            stroke: new ol.style.Stroke({color: '#FF0000', width: 1})
        })
    })],
    'line': [new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255,0,0,0.7)',
            width: 10
        })
    })]
};


(function($){

    // Layers model
    LayersModel = Backbone.Model.extend({
        defaults: {
            "id": "Unknown",
            "label": "Unknown",
            "type": "Unknown",
            "url": "Unknown",
            "num_layer": 0,
            "reload_btn": ''
        }});

    LayersCollection = Backbone.Collection.extend({
        model: LayersModel
    });
    var layers = new LayersCollection();
    
    var LayersView = Backbone.View.extend({
        init: true,
        template: _.template( $('#layerTemplate').html()),
        render: function(){
            this.$el.empty();

            this.collection.each(function(model){
                // Add layer to treeview
                model.attributes.num_layer = gdView.num_layer;
                
                //if(model.attributes.type == 'json')
                //    reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Reload" id="'+this.num_layer+'" onclick="gdView.reloadGeoJSON(this)"/>';
                if(model.attributes.type == 'wms')
                    reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Load JSON" id="'+model.attributes.num_layer+'" onclick="gdView.loadGeoJSON(this)"/>';
                
                model.attributes.reload_btn = reloadBtn;
                
                this.$el.append(this.template(model.toJSON()));

                // Add to treeview
                gdView.apiTreeView.append(gdView.root_ref_tv, {
                        uid: model.attributes.num_layer,
                        success: function(item, options) {
                            //alert('The folder/file items where added on ROOT !');
                            //alert(item);
                        },
                        fail: function(item, options) {
                            //alert('Failed to add the folder/file items on ROOT !');
                        },
                        itemData: {"id": model.attributes.num_layer, "label": model.attributes.id, "inode": false, "checkbox": true, "radio": false }
                    });
                
                // Add layer to map
                layerAdded = gdView.addWMS(model.attributes.id, model.attributes.url);
                
                gdView.layersArray.push(layerAdded);
                gdView.layersNameArray.push(model.attributes.id);
                gdView.num_layer = gdView.num_layer + 1;
                
            }, this);
            
        }
    });
    var layersView = new LayersView({ el: $('#layers_list'), collection: layers });

    
    
    // Search obj model and view
    var Result = Backbone.Model.extend({
        defaults: {
            "id": "Unknown",
            "typeobj": "Unknown",
            "geom": "Unknown",
            "center": "Unknown"
        }
    });

    var Results = Backbone.Collection.extend({
        model: Result,
    });

    var results = new Results();
    var ResultsView = Backbone.View.extend({
        init: true,
        template: _.template('<li class="<%= typeobj %>"><a href="#" onclick="gdView.centerMap(<%= center.coordinates %>)"><%= typeobj %> (<%= id %>)</a></li>'),
        render: function(){
            this.$el.empty();
            gdView.vectorSource.clear();
            this.collection.each(function(model){
                // Add result to list
                this.$el.append(this.template(model.toJSON()));
                
                // Highlight on map
                if(model.attributes.geom.type == 'Point') {
                    gdView.vectorSource.addFeature(new ol.Feature({
                        'geometry': new ol.geom.Point(new ol.proj.transform(model.attributes.geom.coordinates, 'EPSG:4326', 'EPSG:3857')),
                        'type': 'point'
                    }));
                }
                if(model.attributes.geom.type == 'MultiLineString') {
                    var tabCoords = new Array();
                    for(i = 0 ; i < model.attributes.geom.coordinates[0].length; i++)
                        tabCoords.push(new ol.proj.transform(model.attributes.geom.coordinates[0][i], 'EPSG:4326', 'EPSG:3857'));
                    gdView.vectorSource.addFeature(new ol.Feature({
                        'geometry': new ol.geom.LineString(tabCoords),
                        'type': 'line'
                    }));
                }
                
                
            }, this);
            
            if(this.init) {
                $('#search-results').mCustomScrollbar({
                    scrollButtons:{
                        enable:true
                    }
                });        
                this.init = false;
            }
        }
    });
    var resultsView = new ResultsView({ el: $('#search-results ul'), collection: results });

    // Map view
    var GraceDemoView = Backbone.View.extend({
        el: $('body'),
        map: '',
        view: '',
        layersArray: [],
        layersNameArray: [],
        featureOverlay: '',
        num_layer: 0,
        highlight: '',
        HOST_URL: 'http://open.mapquestapi.com',
        SAMPLE_POST: '',
        searchType: '',
        vectorSource: '',
        vector: '',
        apiTreeView: '',
        root_fdp_tv: '',
        root_ref_tv: '',

        events: {
            'click #search_obj' : 'doSearchObjHandler',
            'click #search_place' : 'doSearchPlace',
        },        
        
        initialize: function(){
            _.bindAll(this, 'render');
            this.render();
        },

        render: function(){
            this.init_map();
        },
        
        init_map: function() {
            var base_layers = [];
            this.SAMPLE_POST = this.HOST_URL + '/nominatim/v1/search.php?format=json&json_callback=gdView.renderSearchPlaceNominatim';
            osm = new ol.source.OSM('OSM');
            osmLayer = new ol.layer.Tile({source: osm});
            /*osmLayer.on('postcompose', function(event) {
                var context = event.context;
                var canvas = context.canvas;
                var image = context.getImageData(0, 0, canvas.width, canvas.height);
                var data = image.data;
                for (var i = 0, ii = data.length; i < ii; i += 4) {
                    data[i] = data[i + 1] = data[i + 2] = (3 * data[i] + 4 * data[i + 1] + data[i + 2]) / 8;
                }
                context.putImageData(image, 0, 0);
            });*/
            base_layers.push(osmLayer);

            osmMapquest = new ol.layer.Tile({source: new ol.source.MapQuest({layer: 'osm'}), visible: false})
            base_layers.push(osmMapquest);
            
            var baseLayersList = [
                'OSM',
                'OSM_MapQuest',
                'Aerial',
                'AerialWithLabels',
                'Road'
            ];

            // Bing maps
            var bingStyles = [
                'Aerial',
                'AerialWithLabels',
                'Road'
            ];
            
            var i, ii;
            for (i = 0, ii = bingStyles.length; i < ii; ++i) {
                base_layers.push(new ol.layer.Tile({
                    visible: false,
                    preload: Infinity,
                    source: new ol.source.BingMaps({
                        key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
                    imagerySet: bingStyles[i]
                    })
                }));
            }

            $('#layer-select').change(function() {
                var style = $(this).find(':selected').val();
                var i, ii;
                for (i = 0, ii = base_layers.length; i < ii; ++i) {
                    base_layers[i].setVisible(baseLayersList[i] == style);
                }
            });
            $('#layer-select').trigger('change');            
            
            
            var mousePositionControl = new ol.control.MousePosition({
                coordinateFormat: ol.coordinate.createStringXY(4),
                projection: 'EPSG:4326',
                className: 'custom-mouse-position',
                target: document.getElementById('mouse-position'),
                undefinedHTML: '&nbsp;'
            });    
            
            this.view = new ol.View2D({
                center: ol.proj.transform([-0.2385, 44.9313], 'EPSG:4326', 'EPSG:3857'),
                zoom: 14
            });
            
            this.map = new ol.Map({
                controls: ol.control.defaults().extend([mousePositionControl]),
                layers: base_layers,
                renderer: 'canvas',
                target: 'map',
                view: this.view
            });

            // Display layers
            Backbone.ajax({
                dataType: "json",
                url: '/layersinfos',
                data: "",
                success: function(val){
                    layers = new LayersCollection(val);
                    layersView.collection = layers;
                    layersView.render();
                },
                error: function(val){
                }
            });
            

            
            // Init treeview for layers
            
            /*$('#tree-layers').aciTree({
                ajax: {
                    url: '/layers'
                },
                checkbox: true,
                radio: true,
                unique: true
            });            
            $('#tree-layers').on('acitree', function(event, api, item, eventName, options){
                switch (eventName){
                    case 'checked':
                        if (api.isItem(item)){
                            console.log(api.getId(item));
                            console.log(api.getLabel(item));
                        }
                }
            });*/
            
            this.apiTreeView = $('#tree-layers').aciTree('api');
            this.apiTreeView.append(null, {
                    uid: '0',
                    itemData: [
                        {"id": "root_fdp", "label": "Fonds de plan", "inode": true},
                        {"id": "root_ref", "label": "Référentiel", "inode": true, "checkbox": true}
                              ]
                });
            this.root_fdp_tv = this.apiTreeView.first();
            this.root_ref_tv = this.root_fdp_tv.next();

            
            
            
/*
var my_key =  " qxys8s986meeu8r1euqfnihv"; // clé de développement du site api.ign.fr
var carteLayerConf= Geoportal.Catalogue.CONFIG["GEOGRAPHICALGRIDSYSTEMS.MAPS$GEOPORTAIL:OGC:WMTS"] ;
    var projection = ol.proj.get('EPSG:3857');
    var matrixIds = new Array(19);
    for (var z = 0; z < 19; ++z) {
      matrixIds[z] = ''+z ; //carteLayerConf.layerOptions.matrixIds[z].identifier;
    }
var ignLayer = 
          new ol.layer.TileLayer({
            source: new ol.source.WMTS({
                url: gGEOPORTALRIGHTSMANAGEMENT[gGEOPORTALRIGHTSMANAGEMENT.apiKey].resources['GEOGRAPHICALGRIDSYSTEMS.MAPS:WMTS'].url,
                layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
                matrixSet: carteLayerConf.layerOptions.matrixSet,
                format: carteLayerConf.serviceParams["WMTS"].format,
                projection: carteLayerConf.layerOptions.projection,
                tileGrid: new ol.tilegrid.WMTS({
                    // origin: carteLayerConf.layerOptions.matrixIds[0].topLeftCorner,
                    origin: [-20037508, 20037508],
                    resolutions: carteLayerConf.layerOptions.nativeResolutions,
                    matrixIds: matrixIds,
                }),
                style: carteLayerConf.layerOptions.style
            })
          });
this.map.addLayer(ignLayer);
*/

            // Get infos
            $(this.map.getViewport()).on('mousemove', function(evt) {
                var pixel = gdView.map.getEventPixel(evt.originalEvent);
                gdView.displayFeatureInfo(pixel);
            });

            this.map.on('singleclick', function(evt) {
                gdView.displayFeatureInfo(evt.pixel);
            });
            
            
            //map.on('moveend', onMoveEnd);
            
            var highlightStyleCache = {};
            this.featureOverlay = new ol.FeatureOverlay({
                map: this.map,
                style: function(feature, resolution) {
                    //var text = resolution < 5000 ? feature.get('id_com_insee') : '';
                    var text = feature.get('typeobj') + " : " +  feature.getId();
                    if (!highlightStyleCache[text]) {
                        highlightStyleCache[text] = [new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#d26105',
                                width: 5
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(255,0,0,0.1)'
                            }),
                            text: new ol.style.Text({
                                font: '20px Arial,sans-serif',
                                text: text,
                                fill: new ol.style.Fill({
                                    color: '#FFF'
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#d26105',
                                    width: 3
                                })
                            })
                        })];
                    }
                    return highlightStyleCache[text];
                }
            });  
            
            // vector layer for search results
            this.vectorSource = new ol.source.Vector({});
            this.vector = new ol.layer.Vector({
                source: this.vectorSource,
                style: function(feature, resolution) {
                    return stylesSearch[feature.get('type')];
                }
            });        
            this.map.addLayer(this.vector);
            
        },
        
        // Get infos on features
        displayFeatureInfo: function (pixel) {
            var feature = this.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                return feature;
            });

            var info = document.getElementById('infos-content');
            if (feature) {
                info.innerHTML = feature.get('typeobj') + '<br/>ID: ' + feature.getId();
                for (prop in feature.getProperties()) {
                    if(prop != 'geometry' && prop != 'typeobj') {
                        info.innerHTML = info.innerHTML + '<br/>' + prop + ': ' + feature.get(prop);
                    }
                }
                
            } else {
                info.innerHTML = '&nbsp;';
            }

            if (feature !== this.highlight) {
                if (this.highlight) {
                    this.featureOverlay.removeFeature(this.highlight);
                }
                if (feature) {
                    this.featureOverlay.addFeature(feature);
                }
                this.highlight = feature;
            }
        },
        
        addWMS: function (layer, url) {
            var wmsSource = new ol.source.TileWMS({
                url: url,
                params: {'LAYERS': layer}
            });

            var wms = new ol.layer.Tile({
                source: wmsSource
            });    
            
            this.map.addLayer(wms);

            return wms;
        },

        addGeoJSON: function (table_name, init, idLayer) {
            var extent = this.map.getView().calculateExtent(this.map.getSize());
            var bottomLeft = ol.proj.transform(ol.extent.getBottomLeft(extent), 'EPSG:3857', 'EPSG:4326');
            var topRight = ol.proj.transform(ol.extent.getTopRight(extent), 'EPSG:3857', 'EPSG:4326');
            currentZoom = this.map.getView().getZoom();
            
            if (!init) {
                this.map.removeLayer(this.layersArray[idLayer]);
            }
            
            if(currentZoom > 13) {
                bbox = bottomLeft[0] + ',' + bottomLeft[1] + ',' + topRight[0] + ',' + topRight[1]
            } else {
                alert("Vous devez zoom réduire la vue (zoomez)");
                return;
            }
            
            var objSource = new ol.source.GeoJSON({
                    projection: 'EPSG:3857',
                    url: '/export/data_geojson/' + table_name + '?bbox=' + bbox
                });
            var json_layer = new ol.layer.Vector({
                source: objSource,
                style: styleFunction
            }); 
            //objSource.on('addfeature', function(event) {
            //    window.console.log(event.feature.getGeometry().getCoordinates());
            //});    
            this.map.addLayer(json_layer);
            
            styleObj = legendStyleFunction(table_name);
            if(styleObj[0].getStroke())
                colorObj = styleObj[0].getStroke().getColor();
            else
                colorObj= styleObj[0].getImage().getStroke().getColor();
            
            if (init) {
                this.addLayerToLegend(json_layer, colorObj, table_name, 'json');
            }
            else {
                this.layersArray[idLayer] = json_layer;
            }
        },

        addLayerToLegend: function (layer, colorObj, id, type) {
            reloadBtn = '';
            if(type == 'json')
                reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Reload" id="'+this.num_layer+'" onclick="gdView.reloadGeoJSON(this)"/>';
            if(type == 'wms')
                reloadBtn = '<input type="button" class="btn btn-default btn-load" value="Load JSON" id="'+this.num_layer+'" onclick="gdView.loadGeoJSON(this)"/>';
            
            $('#layers_list').append('<li><div style="width:16px;height:18px;background:'+colorObj+';margin-top:2px; float: left;"></div><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+this.num_layer+'" onclick="gdView.displayLayer(this)" checked> '+id+' '+reloadBtn+'</li>');
            
            this.layersArray.push(layer);
            this.layersNameArray.push(id);
            this.num_layer = this.num_layer + 1;
        },

        displayLayer: function (evt) {    
            this.layersArray[evt.value].setVisible(evt.checked);
        },

        loadGeoJSON: function (evt) {    
            this.addGeoJSON(this.layersNameArray[evt.id],true)    
        },
        
        reloadGeoJSON: function (evt) {    
            this.addGeoJSON(this.layersNameArray[evt.id],false, evt.id)    
        },

        // Geolocalisation
        doSearchPlace: function () {
            
            geocoder_provider = $("input[name='optionsLocalisationRadios']:checked").val();
            if(geocoder_provider == 'nominatim') {
                var newURL = this.SAMPLE_POST + "&q=" + $('#place-to-search').val();
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = newURL;
                document.body.appendChild(script);
            } else {
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({ 'address': $('#place-to-search').val() }, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        //console.log(results[0].geometry.location);                              
                        x = results[0].geometry.location.lng();
                        y = results[0].geometry.location.lat();
                        var new_center = ol.proj.transform([x*1.0, y*1.0], 'EPSG:4326', 'EPSG:3857');
                        var pan = ol.animation.pan({
                            duration: 2000,
                            source: (gdView.view.getCenter())
                        });
                        gdView.map.beforeRender(pan);
                        gdView.view.setCenter(new_center);            
                        
                    }
                    else {
                        console.log("Geocoding failed: " + status);                            
                    }
                });                
            }
        },

        renderSearchPlaceNominatim: function (response) {
            if(response){
                for(var i =0; i < response.length; i++){
                    var result = response[i];
                    var new_center = ol.proj.transform([result.lon*1.0, result.lat*1.0], 'EPSG:4326', 'EPSG:3857');
                    var pan = ol.animation.pan({
                        duration: 2000,
                        source: (this.view.getCenter())
                    });
                    this.map.beforeRender(pan);
                    this.view.setCenter(new_center);            
                    break;
                }       
            }    
        },
        
        doSearchObjHandler: function (e) {
            if($('#obj-to-search').val() != '') {
                Backbone.ajax({
                    dataType: "json",
                    url: '/search/' + $('#obj-to-search').val(),
                    data: "",
                    success: function(val){
                        results = new Results(val);
                        resultsView.collection = results;
                        resultsView.render();
                    },
                    error: function(val){
                    }
                    
                });
            }
        },        
        
        centerMap: function (x, y) {
            var new_center = ol.proj.transform([x*1.0, y*1.0], 'EPSG:4326', 'EPSG:3857');
            var pan = ol.animation.pan({
                duration: 1000,
                source: (this.view.getCenter())
            });
            this.map.beforeRender(pan);
            this.view.setCenter(new_center);            
            
        }

  });
  gdView = new GraceDemoView();
})(jQuery);



