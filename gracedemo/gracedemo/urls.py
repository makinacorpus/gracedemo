from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

from gracemap.views import export_data_geojson, view_map, search_obj, get_layers_infos, get_feature_infos, add_annotation, purge_annotation

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'gracedemo.views.home', name='home'),
    # url(r'^gracedemo/', include('gracedemo.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
     
    #(r'^export/data_geojson/$', export_data_geojson),
    (r'^export/data_geojson/(?P<table_name>[\w-]+)$', export_data_geojson),
    
    (r'^search/(?P<criteria>[\w-]+)$', search_obj),
    
    (r'^layersinfos/$', get_layers_infos),
    
    (r'^getfeatureinfos/$', get_feature_infos),
    
    (r'^addannotation/$', add_annotation),
    
    (r'^purgeannotation/$', purge_annotation),
    
    (r'^$', view_map),
    
    #url(r'^capture/$',  include('screamshot.urls', namespace='screamshot', app_name='screamshot')),
    #(r'^print/$', print_map),

)


