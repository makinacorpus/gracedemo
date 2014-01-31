from __future__ import with_statement

from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from django.template import RequestContext, loader
from django.utils import simplejson
from django.utils.datastructures import SortedDict
from django.conf import settings
from django.utils.translation import ugettext as _
from django.core.servers.basehttp import FileWrapper

#from gracedemo.utils import sync_db, query_db, commit_transaction

#from easydict import EasyDict

#from shapely.wkt import loads
#from geojson import dumps

import json
import sqlite3 as lite
from shutil import copyfile

from tempfile import NamedTemporaryFile

import time
import datetime
import os
import tempfile


@csrf_exempt
def view_map(request):
    """
    View map
    """
    response = HttpResponse()
    return response

@csrf_exempt
def export_data_geojson(request):
    """
    View map
    """
    response = HttpResponse()
    return response



