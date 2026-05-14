import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    class Meta:
        model = Product
        fields = {
            "category": ["exact"],
            "budget_bucket": ["exact"],
            "usage_frequency": ["exact"],
            "type": ["exact"],
        }
