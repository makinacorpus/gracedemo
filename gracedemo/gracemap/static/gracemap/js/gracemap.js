var gdView;

(function($){
    
    // Search obj model and view
    var Result = Backbone.Model.extend({
        defaults: {
            "id": "Unknown",
            "typeobj": "Unknown",
            "geometry": "Unknown"
        }
    });

    var Results = Backbone.Collection.extend({
        model: Result,
    });

    var results = new Results();
    var ResultsView = Backbone.View.extend({
        template: _.template('<li><a href="#" onclick="gdView.centerMap(<%= geometry.coordinates %>)"><%= typeobj %> (<%= id %>)</a></li>'),
        render: function(){
            this.collection.each(function(model){
                this.$el.append(this.template(model.toJSON()));
            }, this)
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
            this.SAMPLE_POST = this.HOST_URL + '/nominatim/v1/search.php?format=json&json_callback=gdView.renderSearchPlace';
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
                layers: [
                    osmLayer
                ],
                renderer: 'canvas',
                target: 'map',
                view: this.view
            });

            this.addWMS("artere");
            this.addWMS("noeud");
            
            //addGeoJSON("artere", true);    
            //addGeoJSON("noeud", true);
            //addGeoJSON("fourreau");  
            
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
        
        addWMS: function (layer) {
            var wmsSourceArtere = new ol.source.TileWMS({
                url: QGISSERVER_URL,
                params: {'LAYERS': layer}
            });

            var wmsArtere = new ol.layer.Tile({
                source: wmsSourceArtere
            });    
            
            this.map.addLayer(wmsArtere);

            colorObj = '#000';

            this.addLayerToLegend(wmsArtere, colorObj, layer, 'wms');
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
            var newURL = this.SAMPLE_POST + "&q=" + $('#place-to-search').val();
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = newURL;
            document.body.appendChild(script);
        },

        renderSearchPlace: function (response) {
            if(response){
                for(var i =0; i < response.length; i++){
                    var result = response[i];
                    var new_center = ol.proj.transform([result.lon*1.0, result.lat*1.0], 'EPSG:4326', 'EPSG:3857');
                    //var new_center = ol.proj.transform([-0.12755, 51.507222], 'EPSG:4326', 'EPSG:3857');
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
            Backbone.ajax({
                dataType: "json",
                url: '/search/' + $('#obj-to-search').val(),
                data: "",
                success: function(val){
                    results = new Results(val);
                    
                    /*$('#search-resul ul').empty();
                    for(feature in val.features) {
                        x = val.features[feature].geometry.coordinates[0];
                        y = val.features[feature].geometry.coordinates[1];
                        typeobj = val.features[feature].properties.typeobj;
                        id = val.features[feature].properties.id;
                        
                        $('#search-results ul').append('<li><a href="/user/messages"></a></li>');
                    }*/
                    //collection.add(val);
                    resultsView.collection = results;
                    resultsView.render();
                },
                error: function(val){
                }
                
            });
        },        
        
        centerMap: function (x, y) {
            var new_center = ol.proj.transform([x*1.0, y*1.0], 'EPSG:4326', 'EPSG:3857');
            this.view.setCenter(new_center); 
        }

  });
  gdView = new GraceDemoView();
})(jQuery);



