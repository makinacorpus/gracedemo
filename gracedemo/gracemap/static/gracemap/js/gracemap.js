
$(function() {
    var map = new ol.Map({
        target: 'map',
        view: new ol.View2D({
            center: ol.proj.transform([2, 48], 'EPSG:4326', 'EPSG:3857'),
        zoom: 6
        })
    });
    var osmSource = new ol.source.OSM();
    var osmLayer = new ol.layer.Tile({source: osmSource});
    map.addLayer(osmLayer);
});



