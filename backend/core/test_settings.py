from .settings import *  # noqa: F401, F403

# La app inventory es un facade legado — sus migraciones crean las mismas
# tablas que los nuevos módulos (purchases, expenses, reports, configuration).
# Al correr tests desde cero ambos conjuntos chocan, por lo que se omiten
# las migraciones legacy de inventory y se usan solo las de las nuevas apps.
MIGRATION_MODULES = {
    "inventory": None,
}
