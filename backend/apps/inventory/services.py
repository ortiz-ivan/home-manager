from .models import Product
from django.db import transaction
from django.utils import timezone


def consume_product(product_id: int, quantity: int = 1):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")

        if product.stock < quantity:
            raise ValueError("Stock insuficiente")

        product.stock -= quantity
        product.save()

        return {
            "product": product,
            "low_stock": product.stock <= product.stock_min
        }


def restock_product(product_id: int, quantity: int = 1):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")

        product.stock += quantity
        product.last_purchase = timezone.localdate()
        product.save()

        return {
            "product": product
        }


def mark_product_out_of_stock(product_id: int):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        product.stock = 0
        product.save()

        return {
            "product": product,
            "low_stock": True,
        }