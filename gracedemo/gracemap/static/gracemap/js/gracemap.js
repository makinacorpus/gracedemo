var gdView;
Proj4js.defs["EPSG:2154"] = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
Proj4js.defs["EPSG:3857"]= "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"; 

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
            "source": '',
            "json_layer": '',
            "json_layer_num": '',
            "tv_root": '',
            "queryable": false
        }});

    LayersCollection = Backbone.Collection.extend({
        model: LayersModel
    });
    var layers = new LayersCollection();
    
    var LayersView = Backbone.View.extend({
        init: true,
        //template: _.template( $('#layerTemplate').html()),
        template: '',
        render: function(){
            this.$el.empty();

            this.collection.each(function(model){
                // Add layer to treeview
                model.attributes.num_layer = gdView.num_layer;
                
                iconQueryable = "";
                if(model.attributes.queryable)
                     iconQueryable = "<div class='queryable' onclick='gdView.showInfosLayer();'></div>";
                    
                labelContent = iconQueryable + '<span class="layername" onclick="gdView.activeLayer(\''+model.attributes.id+'\', this);">'+model.attributes.label+'</span>';
                
                // TODO make this process automatic !
                var root_tv = null;
                if(model.attributes.tv_root == "support") { 
                    root_tv = gdView.root_support_tv;
                }
                if(model.attributes.tv_root == "cablage") { 
                    root_tv = gdView.root_cablage_tv;
                }
                
                //var sub_root = gdView.apiTreeView.searchId(true, true, {id: 'root_support'});
                
                // Add to treeview
                gdView.apiTreeView.append(root_tv, {
                        uid: model.attributes.num_layer,
                        success: function(item, options) {
                        },
                        fail: function(item, options) {
                        },
                        itemData: {"id": model.attributes.num_layer, "label": labelContent, "inode": false, "checked": true, "checkbox": true, "radio": false, "layerName": model.attributes.id}
                    });
                
                // Add layer to map
                layerAdded = gdView.addWMS(model, model.attributes.id, model.attributes.url);
                
                gdView.layersArray.push(layerAdded);
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
            "center": "Unknown",
            "active": false
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
        //layersNameArray: [],
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
        root_cablage_tv: '',
        root_support_tv: '',
        viewResolution: '',
        viewProjection: '',
        mousePositionControl: '',

        events: {
            'click #search_obj' : 'doSearchObjHandler',
            'keypress #place-to-search' : 'doSearchPlace',
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
            

            this.mousePositionControl = new ol.control.MousePosition({
                coordinateFormat: ol.coordinate.createStringXY(4),
                projection: 'EPSG:4326',
                className: 'custom-mouse-position',
                target: document.getElementById('mouse-position'),
                undefinedHTML: '&nbsp;'
            });    
            $('#mouse-position-epsg').change(function() {
                var epsg = $(this).find(':selected').val();
                //proj = new Proj4js.Proj(epsg);
                gdView.mousePositionControl.setProjection(ol.proj.get(epsg));
                //gdView.mousePositionControl.setProjection(proj);
                gdView.map.removeControl(gdView.mousePositionControl);
                gdView.map.addControl(gdView.mousePositionControl);
            });
            
            var scaleLineControl = new ol.control.ScaleLine();

            extentMin = ol.proj.transform([-5.51, 42.5], 'EPSG:4326', 'EPSG:3857');
            extentMax = ol.proj.transform([9, 51.2], 'EPSG:4326', 'EPSG:3857');
            maxExtent = new ol.extent.boundingExtent([extentMin,extentMax]);
            var zoomToExtentControl = new ol.control.ZoomToExtent({extent: maxExtent});
            
            this.view = new ol.View2D({
                center: ol.proj.transform([-0.2385, 44.9313], 'EPSG:4326', 'EPSG:3857'),
                zoom: 14
            });
            
            // Drag n drop vector files
            var dragAndDropInteraction = new ol.interaction.DragAndDrop({
                formatConstructors: [
                    ol.format.GPX,
                    ol.format.GeoJSON,
                    ol.format.IGC,
                    ol.format.KML,
                    ol.format.TopoJSON
                ]
            });
            
            this.map = new ol.Map({
                interactions: ol.interaction.defaults().extend([dragAndDropInteraction]),
                controls: ol.control.defaults().extend([
                    this.mousePositionControl,
                    scaleLineControl,
                    zoomToExtentControl
                ]),
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
            this.apiTreeView = $('#tree-layers').aciTree({checkbox: true, radio: true, checkboxClick: true}).aciTree('api');
            this.apiTreeView.append(null, {
                    uid: '11',
                    itemData: {"id": "root_cablage", "label": "Câblage", "inode": true, "checked": true, "checkbox": true, "radio": false}
                });
            this.root_cablage_tv = this.apiTreeView.first();
            this.root_support_tv = this.apiTreeView.append(null, {
                    uid: '22',
                    itemData: {"id": "root_support", "label": "Support", "inode": true, "checked": true, "checkbox": true, "radio": false}
                });
            this.root_support_tv = this.apiTreeView.last();

            $('#tree-layers').on('acitree', function(event, api, item, eventName, options){
                switch (eventName){
                    case 'checked':
                        if (api.isItem(item)){
                            // if root item
                            if(gdView.apiTreeView.level(item) == 0) {
                                children = gdView.apiTreeView.children(item, true, true);
                                for(i = 0 ; i < children.length ; i++) {
                                    var itemData = gdView.apiTreeView.itemData($(children[i]))
                                    gdView.layersArray[itemData.id].setVisible(true);
                                }
                                // A root item maybe also a layer
                                var itemData = gdView.apiTreeView.itemData(item)
                                if(gdView.layersArray[itemData.id])
                                    gdView.layersArray[itemData.id].setVisible(true);
                            }
                            else {
                                var itemData = gdView.apiTreeView.itemData(item);
                                gdView.layersArray[itemData.id].setVisible(true);
                            }
                        }
                        break;
                    case 'unchecked':
                        if (api.isItem(item)){
                            if(gdView.apiTreeView.level(item) == 0) {
                                children = gdView.apiTreeView.children(item, true, true);
                                for(i = 0 ; i < children.length ; i++) {
                                    var itemData = gdView.apiTreeView.itemData($(children[i]))
                                    gdView.layersArray[itemData.id].setVisible(false);
                                }
                                // A root item maybe also a layer
                                var itemData = gdView.apiTreeView.itemData(item)
                                if(gdView.layersArray[itemData.id])
                                    gdView.layersArray[itemData.id].setVisible(false);
                            }
                            else {
                                var itemData = gdView.apiTreeView.itemData(item);
                                gdView.layersArray[itemData.id].setVisible(false);
                            }
                        }
                        break;
                    default:
                        break;
                }
            });            
            
            // Get infos
            $(this.map.getViewport()).on('mousemove', function(evt) {
                var pixel = gdView.map.getEventPixel(evt.originalEvent);
                gdView.displayFeatureInfo(pixel);
            });

            this.map.on('singleclick', function(evt) {
                gdView.displayFeatureInfo(evt.pixel);
            });
            

            // Highlight
            var highlightStyleCache = {};
            this.featureOverlay = new ol.FeatureOverlay({
                map: this.map,
                style: function(feature, resolution) {
                    //var text = resolution < 5000 ? feature.get('id_com_insee') : '';
                    //var text = feature.get('typeobj') + " : " +  feature.getId();
                    //
                    infoStr = [];
                    for (prop in feature.getProperties()) {
                        if(prop != 'geometry' && prop != 'typeobj') {
                            infoStr.push('\n' + prop + ': ' + feature.get(prop));
                        }
                    }                    
                    text = infoStr.join(', ') || '&nbsp';
                    
                    if (!highlightStyleCache[text]) {
                        highlightStyleCache[text] = [new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#ffff00',
                                width: 5
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(255,255,0,0.1)'
                            }),
                            text: new ol.style.Text({
                                font: '20px Arial,sans-serif',
                                text: text,
                                fill: new ol.style.Fill({
                                    color: '#FFF'
                                }),
                                stroke: new ol.style.Stroke({
                                    color: '#444400',
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
            
            this.viewResolution = (this.map.getView().getResolution());
            this.viewProjection = (this.map.getView().getProjection());
            
            
            // Get feature infos (WMS)
            this.map.on('singleclick', function(evt) {
                // for all queryable layers
                document.getElementById('feature-infos-content').innerHTML = "";
                var foundLayers = layers.where({queryable:true});
                for(i = 0 ; i < foundLayers.length; i++) {
                    var url = foundLayers[i].attributes.source.getGetFeatureInfoUrl(
                        evt.coordinate, gdView.viewResolution, gdView.viewProjection,
                        {'INFO_FORMAT': 'text/html'});
                    
                    if (url) {
                        Backbone.ajax({
                            url: '/getfeatureinfos?url=' + encodeURIComponent(url),
                            success: function(val){
                                document.getElementById('feature-infos-content').innerHTML += val;
                            },
                            error: function(val){
                            }
                        });
                    }
                }
                if(foundLayers.length > 0)
                    $('#feature-infos').modal('show');
                else
                    alert("Il n'y a pas de couche interrogeable");
            });  
            
            
            // KML & other format drag n drop
            dragAndDropInteraction.on('addfeatures', function(event) {
                var vectorSource = new ol.source.Vector({
                    features: event.features,
                    projection: event.projection
                });
                var vectLayer = new ol.layer.Image({
                    source: new ol.source.ImageVector({
                        source: vectorSource,
                        style: kmlStyleFunction
                    })
                })
                gdView.map.getLayers().push(vectLayer);
                gdView.addKmlLayerToLegend(vectLayer, "Fichier externe");
                var view2D = gdView.map.getView().getView2D();
                view2D.fitExtent(vectorSource.getExtent(), gdView.map.getSize());
            });            

            // Intial zoom and center
            if(init_center != '' && init_zoom !='') {
                //coords_center = init_center.split(',');
                this.map.getView().setCenter(init_center);
                this.map.getView().setZoom(init_zoom);
            }
            
        },
        
        activeLayer: function(el, span) {
            // set all layers not active
            layers.each(function(model){
                model.attributes.active = false;
            });
            // set clicked layer active
            var foundLayer = layers.where({id:el});
            if(foundLayer.length > 0) {
                foundLayer[0].attributes.active = true;
            }
            
            // Change class of legend active layer
            $("#tree-layers .layername").removeClass("layer-active");
            
            $(span).addClass("layer-active");
            
            // Load JSON
            this.loadGeoJSON();
            
            // TODO load the features into a grid at the bottom of the map
            
        },
        
        // Get infos on features (json)
        displayFeatureInfo: function (pixel) {
            var features = [];
            var info = document.getElementById('infos-content');
            this.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                features.push(feature);
                if (feature !== gdView.highlight) {
                    if (gdView.highlight) {
                        gdView.featureOverlay.removeFeature(gdView.highlight);
                    }
                    if (feature) {
                        gdView.featureOverlay.addFeature(feature);
                    }
                    gdView.highlight = feature;
                }                
            });
            if (features.length > 0) {
                var infoStr = [];
                var i, ii;
                for (i = 0, ii = features.length; i < ii; ++i) {
                    //infoStr.push(features[i].get('name'));
                    for (prop in features[i].getProperties()) {
                        if(prop != 'geometry' && prop != 'typeobj') {
                            infoStr.push('<br/>' + prop + ': ' + features[i].get(prop));
                        }
                    }                    
                }
                info.innerHTML = infoStr.join(', ') || '&nbsp';
            } else {
                info.innerHTML = '&nbsp;';
            }            
        },
        
        addWMS: function (layerModel, layer, url) {
            var wmsSource = new ol.source.TileWMS({
                url: url,
                params: {'LAYERS': layer}
            });

            layerModel.attributes.source = wmsSource;
            
            var wms = new ol.layer.Tile({
                source: wmsSource
            });    
            
            this.map.addLayer(wms);

            return wms;
        },

        addGeoJSON: function (layerModel) {
            var extent = this.map.getView().calculateExtent(this.map.getSize());
            var bottomLeft = ol.proj.transform(ol.extent.getBottomLeft(extent), 'EPSG:3857', 'EPSG:4326');
            var topRight = ol.proj.transform(ol.extent.getTopRight(extent), 'EPSG:3857', 'EPSG:4326');
            currentZoom = this.map.getView().getZoom();
            
            // if already loaded, delete it before reload it
            if(layerModel.attributes.json_layer != '')
                this.map.removeLayer(this.layersArray[layerModel.attributes.json_layer_num]);
            
            if(currentZoom > 13) {
                bbox = bottomLeft[0] + ',' + bottomLeft[1] + ',' + topRight[0] + ',' + topRight[1]
            } else {
                alert("Vous devez zoom réduire la vue (zoomez)");
                return;
            }
            
            var objSource = new ol.source.GeoJSON({
                    projection: 'EPSG:3857',
                    url: '/export/data_geojson/' + layerModel.attributes.id + '?bbox=' + bbox
                });
            var json_layer = new ol.layer.Vector({
                source: objSource,
                style: styleFunction
            }); 
            this.map.addLayer(json_layer);
            
            styleObj = legendStyleFunction(layerModel.attributes.id);
            if(styleObj[0].getStroke())
                colorObj = styleObj[0].getStroke().getColor();
            else
                colorObj= styleObj[0].getImage().getStroke().getColor();
            
            //if (init) {
            if(layerModel.attributes.json_layer != '')                
                this.layersArray[layerModel.attributes.json_layer_num] = json_layer;
            else
                num_layer = this.addLayerToLegend(json_layer, colorObj, layerModel.attributes.id, 'json');

            layerModel.attributes.json_layer = json_layer;
            layerModel.attributes.json_layer_num = num_layer;
        },

        addLayerToLegend: function (layer, colorObj, id, type) {
            //$('#layers_list').append('<li><div style="width:16px;height:18px;background:'+colorObj+';margin-top:2px; float: left;"></div><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+this.num_layer+'" onclick="gdView.displayLayer(this)" checked> '+'<span class="layername">'+id+'</span></li>');            
            
            this.layersArray.push(layer);
            this.num_layer = this.num_layer + 1;
            
            return (this.num_layer - 1);

        },

        addKmlLayerToLegend: function (layer, id) {
            $('#layers_list').append('<li><div></div><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+this.num_layer+'" onclick="gdView.displayLayer(this)" checked> '+'<span class="layername">'+id+'</span></li>');            
            
            this.layersArray.push(layer);
            this.num_layer = this.num_layer + 1;
            
            return (this.num_layer - 1);

        },
        
        displayLayer: function (evt) {    
            this.layersArray[evt.value].setVisible(evt.checked);
        },

        loadGeoJSON: function (evt) {    
            // Get active layer, and load json from view extent
            var foundLayer = layers.where({active:true});
            if(foundLayer.length > 0) {
                this.addGeoJSON(foundLayer[0])    
            }
        },
        
        // Geolocalisation
        doSearchPlace: function (event) {
            if(event.type == "keypress" && event.key != "Enter")
                return;
            geocoder_provider = $("#search_place").val();
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
            
        },
        
        printMap: function(css) {
            $("head").append(
                $(document.createElement("link")).attr({rel:"stylesheet", type:"text/css", href:css, id: "css_print"})
            );
            var center = this.view.getCenter();
            var zoom = this.view.getZoom();
            this.view.setCenter(center);
            this.view.setZoom(zoom);
            this.map.updateSize();
            
            window.print();

            $("#css_print").remove();
            
            this.view.setCenter(center);
            this.view.setZoom(zoom);
            this.map.updateSize();
        },
        
        measureLine: function() {
            var draw; // global so we can remove it later
            var source = new ol.source.Vector();
            var vector = new ol.layer.Vector({
                source: source,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                    }),
                    image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                    })
                })
            });
            this.map.addLayer(vector);
            draw = new ol.interaction.Draw({
                source: source,
                type: "LineString"
            });
            this.map.addInteraction(draw);
            
            vector.on('drawend', function(evt) {
                alert("ici");
            });
            
            //this.map.removeInteraction(draw);
        },
        
        
        showInfosLayer: function() {
            alert("Cette couche est interrogeable");
        },
        
        getPermalink: function() {
            //var extent = this.map.getView().calculateExtent(this.map.getSize());
            var zoom = this.map.getView().getZoom();
            var center = this.map.getView().getCenter();
            document.getElementById('permalink-content').innerHTML = base_url + "?center=" + center + "&zoom=" + zoom;
            $('#permalink-dialog').modal('show');            
        }

  });
  gdView = new GraceDemoView();
})(jQuery);



