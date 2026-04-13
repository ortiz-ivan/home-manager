from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'dev-secret-key'

DEBUG = True

ALLOWED_HOSTS = []

# --------------------
# APPS
# --------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",

    "apps.inventory",
]

# --------------------
# MIDDLEWARE
# --------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

# --------------------
# URLS / WSGI
# --------------------
ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# --------------------
# DATABASE
# --------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# --------------------
# PASSWORD VALIDATION
# --------------------
AUTH_PASSWORD_VALIDATORS = []

# --------------------
# INTERNATIONALIZATION
# --------------------
LANGUAGE_CODE = "es"
TIME_ZONE = "America/Asuncion"

USE_I18N = True
USE_TZ = True

# --------------------
# STATIC
# --------------------
STATIC_URL = "static/"

# --------------------
# DJANGO CONFIG
# --------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------
# CORS
# --------------------
CORS_ALLOW_ALL_ORIGINS = True