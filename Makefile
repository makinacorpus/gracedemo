VIRTUALENV=virtualenv
PIP=./venv/bin/pip
PYTHON=./venv/bin/python

default:
	@echo "Read README.rst first"

clean:
	rm -rf build dist

virtualenv: $(PYTHON)
$(PYTHON):
	$(VIRTUALENV) venv
	$(PIP) install -U distribute

requirements: virtualenv
	#### ??? ###
	$(PIP) install django==1.4.5
	$(PIP) install django-selectable
	$(PIP) install simplejson
	$(PIP) install django-multisite

	$(PIP) install -r ./requirements.txt

install: requirements
	### ??? ###
	$(PYTHON) ./manage.py collectstatic --noinput
	$(PYTHON) ./manage.py syncdb --all --noinput
	$(PYTHON) ./manage.py createsuperuser --username admin
	$(PYTHON) ./manage.py migrate --fake

	### ??? ###
	$(PYTHON) ./manage.py syncdb
	$(PYTHON) ./manage.py migrate
