
(function($){
    var MapView = Backbone.View.extend({
        el: $('body'),
        map: '',
        view: '',
        layersArray: [],
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
        featureinfos_disable: false,
        draw: '',
        annotateLayer: '',
        drawAnnotation: '',
        vectorDraw: '',
        prev_center: '',
        prev_zoom: '',
        next_center: '',
        next_zoom: '',

        events: {
            'click #search_obj' : 'doSearchObjHandler',
            'keypress #place-to-search' : 'doSearchPlace',
            'keypress #obj-to-search' : 'doSearchObjHandler',
            'click #annotate' : 'annotate',
            'click #annotate-purge' : 'annotatePurge',
            //'click #copy-permalink' : 'copyPermalink'
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
            this.SAMPLE_POST = this.HOST_URL + '/nominatim/v1/search.php?format=json&json_callback=gd.mapView.renderSearchPlaceNominatim';
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
                gd.mapView.mousePositionControl.setProjection(ol.proj.get(epsg));
                //gd.mapView.mousePositionControl.setProjection(proj);
                gd.mapView.map.removeControl(gd.mapView.mousePositionControl);
                gd.mapView.map.addControl(gd.mapView.mousePositionControl);
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
                    layers = new gd.LayersCollection(val);
                    gd.layersView.collection = layers;
                    gd.layersView.render();
                },
                error: function(val){
                }
            });
            
            // Init treeview layers
            this.apiTreeView = $('#tree-layers').aciTree({checkbox: true, radio: true, checkboxClick: true}).aciTree('api');
            // annotations
            this.apiTreeView.append(null, {
                    uid: '33',
                    itemData: {"id": "annotate", "label": "Annotations", "inode": false, "checked": false, "checkbox": true, "radio": false}
                });
            // network
            this.apiTreeView.append(null, {
                    uid: '11',
                    itemData: {"id": "root_cablage", "label": "Câblage", "inode": true, "checked": true, "checkbox": true, "radio": false}
                });
            this.root_cablage_tv = this.apiTreeView.last();
            this.root_support_tv = this.apiTreeView.append(null, {
                    uid: '22',
                    itemData: {"id": "root_support", "label": "Support", "inode": true, "checked": true, "checkbox": true, "radio": false}
                });
            this.root_support_tv = this.apiTreeView.last();
            
            // Events on treeview layers
            $('#tree-layers').on('acitree', function(event, api, item, eventName, options){
                switch (eventName){
                    case 'checked':
                        if (api.isItem(item)){
                            // if root item
                            if(gd.mapView.apiTreeView.itemData(item).id == "annotate") {
                                gd.mapView.annotateLayer.setVisible(true);
                            }
                            
                            if(gd.mapView.apiTreeView.level(item) == 0) {
                                children = gd.mapView.apiTreeView.children(item, true, true);
                                for(i = 0 ; i < children.length ; i++) {
                                    var itemData = gd.mapView.apiTreeView.itemData($(children[i]))
                                    gd.mapView.layersArray[itemData.id].setVisible(true);
                                    // Maj collection
                                    var foundLayers = layers.where({num_layer:itemData.id});
                                    foundLayers[0].attributes.active = true;
                                }
                                // A root item maybe also a layer
                                var itemData = gd.mapView.apiTreeView.itemData(item)
                                if(gd.mapView.layersArray[itemData.id]) {
                                    gd.mapView.layersArray[itemData.id].setVisible(true);
                                    // Maj collection
                                    var foundLayers = layers.where({num_layer:itemData.id});
                                    foundLayers[0].attributes.active = true;
                                }
                            }
                            else {
                                var itemData = gd.mapView.apiTreeView.itemData(item);
                                gd.mapView.layersArray[itemData.id].setVisible(true);
                                // Maj collection
                                var foundLayers = layers.where({num_layer:itemData.id});
                                foundLayers[0].attributes.active = true;
                            }
                        }
                        break;
                    case 'unchecked':
                        if (api.isItem(item)){
                            if(gd.mapView.apiTreeView.level(item) == 0) {
                                if(gd.mapView.apiTreeView.itemData(item).id == "annotate") {
                                    gd.mapView.annotateLayer.setVisible(false);
                                }
                                children = gd.mapView.apiTreeView.children(item, true, true);
                                for(i = 0 ; i < children.length ; i++) {
                                    var itemData = gd.mapView.apiTreeView.itemData($(children[i]))
                                    gd.mapView.layersArray[itemData.id].setVisible(false);
                                    // Maj collection
                                    var foundLayers = layers.where({num_layer:itemData.id});
                                    foundLayers[0].attributes.active = false;
                                }
                                // A root item maybe also a layer
                                var itemData = gd.mapView.apiTreeView.itemData(item)
                                if(gd.mapView.layersArray[itemData.id]) {
                                    gd.mapView.layersArray[itemData.id].setVisible(false);
                                    // Maj collection
                                    var foundLayers = layers.where({num_layer:itemData.id});
                                    foundLayers[0].attributes.active = false;
                                }
                            }
                            else {
                                var itemData = gd.mapView.apiTreeView.itemData(item);
                                gd.mapView.layersArray[itemData.id].setVisible(false);
                                // Maj collection
                                var foundLayers = layers.where({num_layer:itemData.id});
                                foundLayers[0].attributes.active = false;
                            }
                        }
                        break;
                    default:
                        break;
                }
            });            
            
            // Get infos
            $(this.map.getViewport()).on('mousemove', function(evt) {
                var pixel = gd.mapView.map.getEventPixel(evt.originalEvent);
                gd.mapView.displayFeatureInfo(pixel);
                
            });

            this.map.on('singleclick', function(evt) {
                gd.mapView.displayFeatureInfo(evt.pixel);
            });

            // Save state
            this.view.on('propertychange', function(evt) {
                if(evt.key == 'center') {
                    gd.mapView.prev_center = gd.mapView.next_center;
                    gd.mapView.next_center = gd.mapView.view.getCenter();
                    gd.mapView.prev_zoom = gd.mapView.next_zoom;
                    gd.mapView.next_zoom = gd.mapView.view.getZoom();
                }
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
                        if(prop != 'geometry' && prop != 'typeobj' && prop != 'center') {
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
                                    fill: new ol.style.Fill({color: '#FFF'}),
                                    stroke: new ol.style.Stroke({color: '#444', width: 3}),
                                    text: text,
                                    font: '12px Verdana'
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
                if(!gd.mapView.featureinfos_disable) {
                    // for all queryable layers
                    var content_result = "";
                    document.getElementById('feature-infos-content').innerHTML = "";
                    var foundLayers = layers.where({queryable:true, active: true});
                    for(i = 0 ; i < foundLayers.length; i++) {
                        var url = foundLayers[i].attributes.source.getGetFeatureInfoUrl(
                            evt.coordinate, gd.mapView.viewResolution, gd.mapView.viewProjection,
                            {'INFO_FORMAT': 'text/html'});var foundLayers = layers.where({queryable:true});
                        
                        if (url) {
                            Backbone.ajax({
                                url: '/getfeatureinfos?url=' + encodeURIComponent(url),
                                success: function(val){
                                    //document.getElementById('feature-infos-content').innerHTML += val;
                                    content_result += val;
                                    
                                    // TODO for quick demo only, to be removed after !
                                    //inner = document.getElementById('feature-infos-content').innerHTML;
                                    var n = content_result.search("TRANCHEE_1000160");
                                    if(n > 0) {
                                        //document.getElementById('external_infos_link').innerHTML = "<a target='_parent' href='http://demo-job.makina-corpus.net/projects/project/1/information/'>Plus d'informations</a>";
                                        
                                        document.getElementById('feature-infos-content').innerHTML = "<strong>Zone industrielle Sud-Est 1</strong><table>  <tr>    <th>Date de début</th>    <td>01 octobre 2014</td>  </tr>  <tr>    <th>Date de fin</th>    <td>31 décembre 2014</td>  </tr>  <tr>    <th>Statut</th>    <td>En cours</td>  </tr>  <tr>    <th>Phases en cours</th>    <td>Génie civil</td>  </tr></table><a href='http://demo-job.makina-corpus.net/projects/project/1/information/' target='_parent'>Plus d'information</a>";

                                    }
                                    var n = content_result.search("TRANCHEE_1003216");
                                    if(n > 0) {
                                        //document.getElementById('external_infos_link').innerHTML = "<a  target='_parent' href='http://demo-job.makina-corpus.net/projects/project/2/information/'>Plus d'informations</a>";
                                        
                                        document.getElementById('feature-infos-content').innerHTML = "<strong>Andokoi Ouest 1</strong><table>  <tr>    <th>Date de début</th>    <td>01 novembre 2014 </td>  </tr>  <tr>    <th>Date de fin</th>    <td>01 février 2015</td>  </tr>  <tr>    <th>Statut</th>    <td>En préparation</td>  </tr>  <tr>    <th>Phases en cours</th>    <td>Pré-inscriptions</td>  </tr></table><a href='http://demo-job.makina-corpus.net/projects/project/2/information/' target='_parent'>Plus d'information</a>";
                                    }
                                    var n = content_result.search("TRANCHEE_1003215");
                                    if(n > 0) {
                                        //document.getElementById('external_infos_link').innerHTML = "<a  target='_parent' href='http://demo-job.makina-corpus.net/projects/project/3/information/'>Plus d'informations</a>";
                                        
                                        document.getElementById('feature-infos-content').innerHTML = "<strong>Andokoi Ouest 2</strong><table>  <tr>    <th>Date de début</th>    <td>01 octobre 2014 </td>  </tr>  <tr>    <th>Date de fin</th>    <td>01 février 2015</td>  </tr>  <tr>    <th>Statut</th>    <td>En cours</td>  </tr>  <tr>    <th>Phases en cours</th>    <td>Fibre optique rue 1, Tranchées rue 2</td>  </tr>  <tr>    <th>Alertes</th>    <td style='color:red;font-weight:bold'>La phase 'Fibre optique rue 1' devrait être terminée</td>  </tr></table><a href='http://demo-job.makina-corpus.net/projects/project/3/information/' target='_parent'>Plus d'information</a>";
                                    }
                                    //

                                },
                                error: function(val){
                                }
                            });
                        }
                    }
                    if(foundLayers.length > 0) {
                       $('#feature-infos').modal('show');
                    }
                    else
                        alert("Il n'y a pas de couche interrogeable");
                }
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
                gd.mapView.map.getLayers().push(vectLayer);
                gd.mapView.addKmlLayerToLegend(vectLayer, "Fichier externe");
                var view2D = gd.mapView.map.getView().getView2D();
                view2D.fitExtent(vectorSource.getExtent(), gd.mapView.map.getSize());
            });            

            // Add save state control
            this.prevStateControl();

            // Add geoloc control
            this.geolocaliseControl();
            
            // Annotations
            this.addAnnotationLayer(false, true);
        },
        
        addAnnotationLayer: function(visible, init) {
            if(this.annotateLayer)
                this.map.removeLayer(this.annotateLayer);
            
            var objSource = new ol.source.GeoJSON({
                    projection: 'EPSG:3857',
                    url: '/export/data_geojson/annotate'
                });
            this.annotateLayer = new ol.layer.Vector({
                source: objSource,
                style: styleFunction
            }); 
            this.map.addLayer(this.annotateLayer);
            if(init) {
                this.drawAnnotation = new ol.interaction.Draw({
                    source: objSource,
                    type: "LineString"
                });            
            }
            
            this.annotateLayer.setVisible(visible);
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
            
            if(span)
                $(span).addClass("layer-active");
            
            // Load JSON
            this.loadGeoJSON();
            
        },
        
        // Get infos on features (json)
        displayFeatureInfo: function (pixel) {
            var features = [];
            var info = document.getElementById('infos-content');
            this.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                features.push(feature);
                if (feature !== gd.mapView.highlight) {
                    if (gd.mapView.highlight) {
                        gd.mapView.featureOverlay.removeFeature(gd.mapView.highlight);
                    }
                    if (feature) {
                        gd.mapView.featureOverlay.addFeature(feature);
                    }
                    gd.mapView.highlight = feature;
                }                
            });
            if (features.length > 0) {
                // features found
                var infoStr = [];
                var i, ii;
                for (i = 0, ii = features.length; i < ii; ++i) {
                    //infoStr.push(features[i].get('name'));
                    for (prop in features[i].getProperties()) {
                        if(prop != 'geometry' && prop != 'typeobj') {
                            infoStr.push('<br/>' + prop + ': ' + features[i].get(prop));
                        }
                    }
                    infoStr.push('<div class="infos-sep"></div>');
                }
                info.innerHTML = infoStr.join(' ') || '&nbsp';
            } else {
                gd.mapView.featureOverlay.removeFeature(gd.mapView.highlight);
                gd.mapView.highlight = '';
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
            
            if(layerModel.attributes.json_layer != '')                
                this.layersArray[layerModel.attributes.json_layer_num] = json_layer;
            else {
                this.layersArray.push(json_layer);
                this.num_layer = this.num_layer + 1;
                num_layer = this.num_layer;
            }
            
            layerModel.attributes.json_layer = json_layer;
            layerModel.attributes.json_layer_num = num_layer;
            
            // Add infos to json-objects-contents panel
            // Empty the json table result
            $('#json-objects-contents-'+layerModel.attributes.id+' > tbody tr').remove();
            $('#json-objects-contents-'+layerModel.attributes.id+' > thead tr').remove();
            
            // Open the table
            $('#json-objects-collapse').collapse('show');
            
            // For each feature, add to table list
            objSource.on('addfeature', function(event) {
                var feature = event.feature;
                
                cols = [];
                table_headers = [];
                table_name = '';
                center= '';
                for (prop in feature.getProperties()) {
                    if(prop == 'typeobj') {
                        table_name = feature.get(prop);
                    }
                    if(prop == 'center') {
                        center = feature.get(prop);
                        center = center.replace('POINT(','');
                        center = center.replace(')','');
                        center = center.replace(' ',',');
                    }
                    if(prop != 'geometry'  && prop != 'center' && prop != 'typeobj') {
                        table_headers.push('<th>' + prop + '</th>');
                        cols.push('<td>' + feature.get(prop) + '</td>');
                    }
                }                    
                table_header = '<tr>' + table_headers.join('') + '<tr/>';
                table_row = '<tr onclick="javascript:gd.mapView.focusOnObj('+center+', '+feature.getId()+')">' + cols.join('') + '<tr/>';
                
                var tbody = $('#json-objects-contents-'+table_name+' tbody');
                if (tbody.html() == '')
                    $('#json-objects-contents-'+table_name+' > thead').append(table_header);
                
                $('#json-objects-contents-'+table_name+' > tbody:last').append(table_row);
                
                
            });
            
        },

        addKmlLayerToLegend: function (layer, id) {
            $('#layers_list').append('<li><div></div><input type="checkbox" name="check_'+id+'" id="check_'+id+'" value="'+this.num_layer+'" onclick="gd.mapView.displayLayer(this)" checked> '+'<span class="layername">'+id+'</span></li>');            
            
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
                            source: (gd.mapView.view.getCenter())
                        });
                        gd.mapView.map.beforeRender(pan);
                        gd.mapView.view.setCenter(new_center);            
                        
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
            if(e.type == "keypress" && e.key != "Enter")
                return;
            
            if($('#obj-to-search').val() != '') {
                Backbone.ajax({
                    dataType: "json",
                    url: '/search/' + $('#obj-to-search').val(),
                    data: "",
                    success: function(val){
                        results = new gd.Results(val);
                        gd.resultsView.collection = results;
                        gd.resultsView.render();
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
            className = $('#measure-dist-btn').attr('class');
            if(className.indexOf('btn-warning') == -1) {
                $('#measure-dist-btn').prop('value', 'Stop mesure');    
                $('#measure-dist-btn').addClass("btn-warning");
                // Stop listening to WMS request on map
                this.featureinfos_disable = true;
                
                var draw; // global so we can remove it later
                var source = new ol.source.Vector();
                this.vectorDraw = new ol.layer.Vector({
                    source: source,
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.2)'
                        })
                    })
                });
                this.map.addLayer(this.vectorDraw);
                this.draw = new ol.interaction.Draw({
                    source: source,
                    type: "LineString"
                });
                this.map.addInteraction(this.draw);
                
                this.draw.on('drawend', function(evt) {
                    // Calculate distance
                    gd.mapView.vectorDraw.getSource().forEachFeature(function(feature) {
                        var coord3857 = feature.getGeometry().getCoordinates();
                        length = 0;
                        for(i = 1 ; i < coord3857.length ; i++) {
                            
                            var trans = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
                            var coord4326 = [trans(coord3857[i-1]),trans(coord3857[i])];
                            length += ol.sphere.NORMAL.haversineDistance(coord4326[0], coord4326[1]);
                        }
                        document.getElementById('measure-result').innerHTML = length.toFixed(3) + " m";
                        // And delete the feature
                        //gd.mapView.vectorDraw.getSource().removeFeature(feature);
                    });
                });
                
            } else {
                $('#measure-dist-btn').prop('value', 'Mesure linéaire');    
                $('#measure-dist-btn').removeClass("btn-warning");
                // Restore listening to WMS request on map
                this.featureinfos_disable = false;
                
                this.map.removeInteraction(this.draw);
                this.map.removeLayer(this.vectorDraw);
                
                document.getElementById('measure-result').innerHTML = '';
            }
        },
        
        showInfosLayer: function() {
            alert("Cette couche est interrogeable");
        },
        
        getPermalink: function() {
            var zoom = this.map.getView().getZoom();
            var center = this.map.getView().getCenter();
            document.getElementById('permalink-content').innerHTML = base_url + "?center=" + center + "&zoom=" + zoom;
            $('#permalink-dialog').modal('show');            
        },
        
        prevStateControl: function() {
            $('.ol-overlaycontainer-stopevent').append('<div class="ol-zoom-previous ol-zoom-extent ol-unselectable"><button id="btn-zoom-previous" class="ol-has-tooltip"><span role="tooltip">Zoom précédent</span></button></div>');            
            
            $('#btn-zoom-previous').click(function() {
                if(gd.mapView.prev_center)
                    gd.mapView.view.setCenter(gd.mapView.prev_center);
                if(gd.mapView.prev_zoom)
                    gd.mapView.view.setZoom(gd.mapView.prev_zoom);                
            });            
        },
        
        focusOnObj: function(x,y, featureId) {
            var new_center = ol.proj.transform([x*1.0, y*1.0], 'EPSG:4326', 'EPSG:3857');
            var pan = ol.animation.pan({
                duration: 2000,
                source: (gd.mapView.view.getCenter())
            });
            gd.mapView.map.beforeRender(pan);
            gd.mapView.view.setCenter(new_center);            
            
            // Empty featureoverlay
            features = gd.mapView.featureOverlay.getFeatures();
            features.forEach(function(feature) {
                gd.mapView.featureOverlay.removeFeature(feature);
            });
            // Highlight selected object
            var features = [];
            pixel = gd.mapView.map.getPixelFromCoordinate(new_center);
            var features = [];
            gd.mapView.map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                if(feature.getId() == featureId)
                    gd.mapView.featureOverlay.addFeature(feature);
            });
            
        },
        
        annotate: function() {
            
            $('#annotate').addClass("btn-warning");
            
            if(this.annotateLayer == '') {
                this.map.addInteraction(this.drawAnnotation);
                this.featureinfos_disable = true;
            } else {
                this.map.addInteraction(this.drawAnnotation);
                this.featureinfos_disable = true;
            }
            
            this.drawAnnotation.on('drawend', function(evt) {
                comment = $('#annotate-text').val();
                $('#annotate').removeClass("btn-warning");
                var coord3857 = evt.feature.getGeometry().getCoordinates();
                data = {'geom': coord3857.join(" "), 'comment': comment};
                // Record annotation to DB
                $.ajax({
                    type: "POST",
                    url: '/addannotation/',
                    data: data,
                    success: function(val){
                        // reload layer
                        gd.mapView.addAnnotationLayer(true, false);
                    }
                });                
                
                // Remove interaction
                gd.mapView.map.removeInteraction(gd.mapView.drawAnnotation);
                gd.mapView.featureinfos_disable = false;
            });
            
        },

        annotatePurge: function() {
            if (confirm('Purger toutes les annotations ?')) { 
                $.ajax({
                    type: "GET",
                    url: '/purgeannotation/',
                    success: function(val){
                        // reload layer
                        gd.mapView.addAnnotationLayer(true, false);
                    }
                });
            }
        },
        
        
        geolocaliseControl: function() {
            $('.ol-overlaycontainer-stopevent').append('<div class="ol-geolocalise ol-zoom-extent ol-unselectable"><button id="btn-geolocalise" class="ol-has-tooltip"><span role="tooltip">Se géolocaliser</span></button></div>');            
            
            $('#btn-geolocalise').click(function() {
                gd.mapView.geolocalise();
            });            
        },
        
        geolocalise: function() {
            var options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
            };        
            if(navigator.geolocation) {
                var userPosition = navigator.geolocation.getCurrentPosition(this.geolocaliseSuccess, this.geolocaliseError, options);
            } else {
                alert('Votre navigateur ne supporte pas la géolocalisation HTML5');
            }
        },

        geolocaliseSuccess: function(position) {
            // Get lat/lon
            var latitude = position.coords.latitude;
            var longitude = position.coords.longitude;
            
            var new_center = ol.proj.transform([longitude*1.0, latitude*1.0], 'EPSG:4326', 'EPSG:3857');
            var pan = ol.animation.pan({
                duration: 2000,
                source: (gd.mapView.view.getCenter())
            });
            gd.mapView.map.beforeRender(pan);
            gd.mapView.view.setCenter(new_center);
        },
        
        geolocaliseError: function(error) {
            switch(error.code) {
                    case error.UNKNOWN_ERROR:
                        alert("La géolocalisation a rencontré une erreur.");
                    break;
                    case error.PERMISSION_DENIED:
                        alert("L'utilisateur n'a pas voulu donner sa position.");
                    break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Les coordonnées de l'utilisateur n'ont pas pu être trouvées.");
                    break;
                    case error.TIMEOUT:
                        alert("La géolocalisation prend trop de temps.");
                    break;
            }                        
        }
        

        /*copyPermalink: function(){
            window.clipboardData.setData('Text', $('#permalink-content').html()); 
            $('#permalink-dialog').modal('hide');
        } */       
                

  });
  gd.mapView = new MapView();
  // Intial zoom and center
  if(init_center != '' && init_zoom !='') {
      //coords_center = init_center.split(',');
      gd.mapView.map.getView().setCenter(init_center);
      gd.mapView.map.getView().setZoom(init_zoom);
  }
  
  // TODO: temporary for demo
  gd.mapView.map.getView().setCenter([-454465, 598697]);
  
})(jQuery);



