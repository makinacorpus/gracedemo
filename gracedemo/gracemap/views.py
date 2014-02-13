from __future__ import with_statement

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from django.template import RequestContext, loader
from django.utils import simplejson
from django.utils.datastructures import SortedDict
from django.conf import settings
from django.utils.translation import ugettext as _
from django.core.servers.basehttp import FileWrapper

#from easydict import EasyDict
from shapely.wkt import loads
from geojson import dumps

import json
import sqlite3 as lite
from shutil import copyfile
from tempfile import NamedTemporaryFile

import time
import datetime
import os
import tempfile

from gracemap.utils import sync_db, query_db, commit_transaction


@csrf_exempt
def view_map(request):
    """
    View map
    """
    rdict = {'x': 45, 'y': 5}
    template = loader.get_template('gracemap/index.html')
    context = RequestContext(request, rdict)
    return HttpResponse(template.render(context))      

@csrf_exempt
def export_data_geojson(request, table_name):
    """
    Export data from DataBase as geojson format
    """
    
    response_content = []
    #params = request.POST
    #if params:
        #table_name = params['table_name']
        #original_column_name = params['column_name']
    #else:
        #response_content.append({
            #'status': _("No POST param given")
        #})
        #response = HttpResponse()
        #simplejson.dump(response_content, response,
                    #ensure_ascii=False, separators=(',', ':'))
        #return response
    
    # Get infos
    response_objects = []
    response_content = {"type": "FeatureCollection", "features": []}

    # Get the operation on the column if necessary (percents, rounds)    
    get_data_object_geojson(response_objects, table_name)

    response_content["features"] = response_objects

    response = HttpResponse()
    simplejson.dump(response_content, response,
                ensure_ascii=False, separators=(',', ':'))

    return response



def get_data_object_geojson(response_content, table_name):
    """
    Perform a SELECT on the DB to retreive infos on associated object, geojson format
    Param: table_name : name of the table
    """

    select_columns = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('select_col')
    geom_column = settings.GRACE_TABLE_INFOS_GEOJSON.get(table_name).get('geom_col')
    
    # replace the geometry stringNone
    #string_to_replace = "ST_AsText(ST_SnapToGrid(ST_Transform(%s,4326),0.00001))" % (geom_column)
    #replace_string = "ST_AsText(ST_SnapToGrid(ST_Transform(ST_Centroid(%s),4326),0.00001))" % (geom_column)
    #select_columns = select_columns.replace(string_to_replace, replace_string)        
    
    #select_string = "SELECT %s FROM %s limit 100" % (select_columns, table_name)
    select_string = "SELECT %s FROM %s" % (select_columns, table_name)

    cursor = query_db(select_string)
    i = 0  # feature index
    for row in cursor.fetchall():
        data = zip([column[0] for column in cursor.description], row)
        feat_dict = SortedDict({"type": "Feature", "id": i})
        properties_dict = SortedDict({})
        for attr in data:
            key = attr[0]
            val = attr[1]
            if type(val).__name__ == "date":
                val = val.strftime("%d/%m/%Y")

            if key == "geom":
                geom = loads(val)
                geometry_dict = dumps(geom)
            else:
                properties_dict[key] = val

        feat_dict["properties"] = properties_dict
        feat_dict["geometry"] = simplejson.loads(geometry_dict)

        i = i + 1
        response_content.append(feat_dict)




