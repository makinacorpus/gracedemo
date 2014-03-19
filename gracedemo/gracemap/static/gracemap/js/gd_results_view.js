// Search obj model and view
gd.Result = Backbone.Model.extend({
    defaults: {
        "id": "Unknown",
        "typeobj": "Unknown",
        "geom": "Unknown",
        "center": "Unknown",
        "active": false
    }
});

gd.Results = Backbone.Collection.extend({
    model: gd.Result,
});

var results = new gd.Results();
var ResultsView = Backbone.View.extend({
    init: true,
    template: _.template('<li class="<%= typeobj %>"><a href="#" onclick="gd.mapView.centerMap(<%= center.coordinates %>)"><%= typeobj %> (<%= id %>)</a></li>'),
    render: function(){
        this.$el.empty();
        gd.mapView.vectorSource.clear();
        this.collection.each(function(model){
            // Add result to list
            this.$el.append(this.template(model.toJSON()));
            
            // Highlight on map
            /*
            if(model.attributes.geom.type == 'Point') {
                gd.mapView.vectorSource.addFeature(new ol.Feature({
                    'geometry': new ol.geom.Point(new ol.proj.transform(model.attributes.geom.coordinates, 'EPSG:4326', 'EPSG:3857')),
                    'type': 'point'
                }));
            }
            if(model.attributes.geom.type == 'MultiLineString') {
                var tabCoords = new Array();
                for(i = 0 ; i < model.attributes.geom.coordinates[0].length; i++)
                    tabCoords.push(new ol.proj.transform(model.attributes.geom.coordinates[0][i], 'EPSG:4326', 'EPSG:3857'));
                gd.mapView.vectorSource.addFeature(new ol.Feature({
                    'geometry': new ol.geom.LineString(tabCoords),
                    'type': 'line'
                }));
            }
            */
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
gd.resultsView = new ResultsView({ el: $('#search-results ul'), collection: results });  
