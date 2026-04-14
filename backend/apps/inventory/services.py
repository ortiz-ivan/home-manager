from .models import Product
from django.db import transaction
from django.utils import timezone


def _validate_consumable(product: Product):
    if product.type != "consumable":
        raise ValueError("Esta acción solo aplica a productos consumibles")

def consume_product(product_id: int, quantity: int = 1):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        _validate_consumable(product)

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

        _validate_consumable(product)

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

        _validate_consumable(product)

        product.stock = 0
        product.save()

        return {
            "product": product,
            "low_stock": True,
        }
    

def register_payment(product_id: int):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        if product.type not in ["service", "subscription"]:
            raise ValueError("Solo aplica a servicios o suscripciones")

        product.last_purchase = timezone.localdate()

        # lógica simple: próximo mes
        if product.next_due_date:
            product.next_due_date = product.next_due_date.replace(
                month=product.next_due_date.month % 12 + 1
            )

        product.save()

        return {
            "product": product
        }