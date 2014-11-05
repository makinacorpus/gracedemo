Proj4js.defs["EPSG:2154"] = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
Proj4js.defs["EPSG:3857"]= "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"; 

window.gd = {
    
    mapView: '',
    layersView: '',
    resultsView: '',
    MapView: '',
    LayersCollection: {},
    Results: {},
    
    init: function () {
        $('.panel-widget').on('click.bs.collapse.data-api', '[data-toggle=collapse]', function (e) {
            //alert("ici");
        })        
    }
}

$(document).ready(function () {
    gd.init();
});